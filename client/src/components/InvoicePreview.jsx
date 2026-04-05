// Updated InvoicePreview.jsx with better styling and dynamic invoice number
// Updated InvoicePreview.jsx with formatted address parsing
import React from "react";
//import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
export default function InvoicePreview({ company, user, client, invoice }) {
  const previewRef = React.useRef(null);
  const currency = (valueInCents) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format((valueInCents ?? 0) / 100);

  const formatDate = (iso) => {
    if (!iso) return null;
    const parts = String(iso).slice(0, 10).split("-");
    if (parts.length !== 3) return null;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  // --- Address parsing helper ---
  const parseAddress = (addressStr) => {
    if (!addressStr) return { street: "", cityStateZip: "" };
    const cleaned = addressStr.replace(/\s+,/g, ",").trim();
    const lines = cleaned
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    let street = "",
      cityStateZip = "";

    if (lines.length >= 2) {
      street = lines[0];
      cityStateZip = lines[1];
    } else {
      const [, s1 = "", s2 = ""] = cleaned.match(/^([^,]+),(.*)$/) || [];
      if (s2) {
        street = s1.trim();
        cityStateZip = s2.trim().replace(/^,/, "").trim();
      } else {
        street = cleaned;
      }
    }

    const m = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (m) {
      const [, city, st, zip] = m;
      cityStateZip = `${city.trim()}, ${st} ${zip}`;
    }

    return { street, cityStateZip };
  };

  // --- Company + user info ---
  const businessName =
    (company?.name && company.name.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Company name";

  const addressStr = company?.address?.trim() || user?.address?.trim() || "";
  const { street, cityStateZip } = parseAddress(addressStr);

  const phone = user?.phone?.trim() || company?.phone?.trim() || "";
  const contactName = [user?.firstName, user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  const invoiceNumber = invoice?.invoiceNumber
    ? String(invoice.invoiceNumber).trim()
    : "";
  const formattedInvoiceDate = formatDate(invoice?.invoiceDate);
  const loadRef = invoice?.loadRef?.trim() || "";
  const hasContactName = Boolean(contactName);
  const hasPhone = Boolean(phone);
  const invoiceLineItems = React.useMemo(() => {
    if (Array.isArray(invoice?.lineItems) && invoice.lineItems.length) {
      return invoice.lineItems.map((item, index) => ({
        id: item?.id || `line-${index}`,
        description: item?.description || "",
        amountCents:
          typeof item?.amountCents === "number" &&
          Number.isFinite(item.amountCents)
            ? item.amountCents
            : null,
        isPrimary: item?.isPrimary ?? index === 0,
      }));
    }
    if (invoice?.description) {
      return [
        {
          id: "primary",
          description: invoice.description,
          amountCents:
            typeof invoice?.amountCents === "number" &&
            Number.isFinite(invoice.amountCents)
              ? invoice.amountCents
              : null,
          isPrimary: true,
        },
      ];
    }
    return [
      {
        id: "primary",
        description: "",
        amountCents:
          typeof invoice?.amountCents === "number" &&
          Number.isFinite(invoice.amountCents)
            ? invoice.amountCents
            : null,
        isPrimary: true,
      },
    ];
  }, [invoice]);

  const totalCents = React.useMemo(() => {
    if (
      typeof invoice?.amountCents === "number" &&
      Number.isFinite(invoice.amountCents)
    ) {
      return invoice.amountCents;
    }
    return invoiceLineItems.reduce(
      (sum, item) =>
        sum + (typeof item.amountCents === "number" ? item.amountCents : 0),
      0
    );
  }, [invoice, invoiceLineItems]);

  const handleDownloadPdf = React.useCallback(() => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginLeft = 20;
    const marginRight = 20;
    const usableWidth = pageWidth - marginLeft - marginRight;
    const brandBlue = { r: 26, g: 88, b: 168 };
    const paleBlue = { r: 232, g: 241, b: 252 };
    let y = 18;

    const addLabelValue = (label, value, x, yPos, options = {}) => {
      const { bold = false, skipWhenEmpty = false } = options;
      if (skipWhenEmpty && !value) return yPos;
      pdf.setFontSize(9);
      pdf.setTextColor(90);
      pdf.text(label, x, yPos);
      pdf.setTextColor(0);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      const display = value || "—";
      pdf.text(display, x, yPos + 5);
      pdf.setFont("helvetica", "normal");
      return yPos + 10;
    };

    const addHeaderLogo = () => {
      

      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.setFontSize(12);
      //pdf.text("US PRIDE LOGISTICS INC", marginLeft + 30, y + 2);
      pdf.setFont("helvetica", "bold");
      pdf.text(businessName, marginLeft, y + 2);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);
      if (street) {
        pdf.text(street, marginLeft, y + 8);
      }
      if (cityStateZip) {
        pdf.text(cityStateZip, marginLeft, y + 13);
      }
      if (phone) {
        pdf.text(phone, marginLeft, y + 18);
      }
      y += 22;
    };


      const addInvoiceTitle = () => {
      //pdf.setFillColor(paleBlue.r, paleBlue.g, paleBlue.b);
      //pdf.rect(pageWidth - marginRight - 45, 12, 45, 20, "F");
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.text("INVOICE", pageWidth - marginRight - 40, 26);
      pdf.setTextColor(60);
      pdf.setFontSize(9);
      //const contactLines = [businessName, street, cityStateZip, phone]
      
    };

    const addClientBox = () => {
      pdf.setFillColor(paleBlue.r, paleBlue.g, paleBlue.b);
      pdf.rect(marginLeft, y, usableWidth, 18, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.text("Bill To", marginLeft + 3, y + 12);
      pdf.setTextColor(0);
      pdf.setFont("helvetica", "normal");
      pdf.text(client?.name || "Client", marginLeft + 25, y + 12);
      y += 24;
    };

    const addInvoiceMeta = () => {
      const col1X = marginLeft;
      const col2X = marginLeft + usableWidth / 2 + 2;

      const leftEntries = [
        { label: "Invoice No:", value: invoiceNumber, bold: true },
        { label: "Invoice date:", value: formattedInvoiceDate },
        { label: "Load reference:", value: loadRef },
      ];

      let leftY = y;
      leftEntries.forEach((entry) => {
        leftY = addLabelValue(entry.label, entry.value, col1X, leftY, {
          bold: entry.bold,
          skipWhenEmpty: true,
        });
      });

      const dueDate = (() => {
        if (formattedInvoiceDate && client?.paymentTermsDays) {
          const dt = new Date(invoice?.invoiceDate);
          if (!isNaN(dt)) {
            dt.setDate(dt.getDate() + Number(client.paymentTermsDays));
            return formatDate(dt.toISOString().slice(0, 10));
          }
        }
        return null;
      })();

      const deliveryDate = formattedInvoiceDate || null;

      const rightEntries = [
        { label: "Due date:", value: dueDate },
        {
          label: "Payment terms:",
          value: client?.paymentTermsDays
            ? `Net ${client.paymentTermsDays}`
            : null,
        },
        { label: "Delivery date:", value: deliveryDate },
      ];

      let yRight = y;
      rightEntries.forEach((entry) => {
        yRight = addLabelValue(entry.label, entry.value, col2X, yRight, {
          skipWhenEmpty: true,
        });
      });
      y = Math.max(leftY, yRight) + 8;
    };

    const addBillTo = () => {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.text("Bill To", marginLeft, y + 2);
      pdf.setTextColor(0);
      pdf.setFont("helvetica", "normal");
      const addressLines = (client?.address || "")
        .split(/\r?\n/)
        .filter(Boolean);
      const lines = [client?.name || "Client", ...addressLines];
      lines.forEach((line, idx) => {
        pdf.text(line, marginLeft, y + 8 + idx * 5);
      });
      y += 8 + lines.length * 5;
    };
  const addTable = () => {
      y += 4;
      const descWidth = usableWidth * 0.56;
      const qtyWidth = usableWidth * 0.12;
      const unitWidth = usableWidth * 0.16;

      const headerY = y;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.text("DESCRIPTION", marginLeft, headerY);
      pdf.text("QUANTITY", marginLeft + descWidth + 4, headerY, { align: "right" });
      pdf.text(
        "UNIT PRICE",
        marginLeft + descWidth + qtyWidth + 8,
        headerY,
        { align: "right" }
      );
      pdf.text(
        "AMOUNT",
        marginLeft + descWidth + qtyWidth + unitWidth + 12,
        headerY,
        { align: "right" }
      );
      pdf.setTextColor(0);
      pdf.setFont("helvetica", "normal");
      pdf.setDrawColor(230, 230, 230);
      pdf.line(marginLeft, headerY + 3, marginLeft + usableWidth, headerY + 3);

      let rowY = headerY + 10;
      invoiceLineItems.forEach((item, index) => {
        const amount =
          typeof item.amountCents === "number" && Number.isFinite(item.amountCents)
            ? item.amountCents
            : 0;
        const hasDescription = Boolean(item.description);
        const hasAmount = amount > 0;
        const hideRow = !item.isPrimary && !hasDescription && !hasAmount;
        if (hideRow) return;

        const desc = item.description || (item.isPrimary ? "Describe the load…" : "");
        const wrappedDesc = pdf.splitTextToSize(desc, descWidth - 2);
        const height = Math.max(8, wrappedDesc.length * 5);

        pdf.text(wrappedDesc, marginLeft, rowY);
        pdf.text("1", marginLeft + descWidth + 4, rowY, { align: "right" });
        pdf.text(
          currency(amount),
          marginLeft + descWidth + qtyWidth + 8,
          rowY,
          { align: "right" }
        );
        pdf.text(
          currency(amount),
          marginLeft + descWidth + qtyWidth + unitWidth + 12,
          rowY,
          { align: "right" }
        );

        rowY += height + 4;
        pdf.setDrawColor(240, 240, 240);
        pdf.line(marginLeft, rowY - 2, marginLeft + usableWidth, rowY - 2);
      });

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.text(
        "TOTAL",
        marginLeft + descWidth + qtyWidth + unitWidth + 12,
        rowY + 6,
        { align: "right" }
      );
      pdf.text(
        currency(totalCents),
        marginLeft + descWidth + qtyWidth + unitWidth + 12,
        rowY + 12,
        { align: "right" }
      );
      pdf.setTextColor(0);
      y = rowY + 20;
    };

      const addFooter = () => {
      pdf.setFillColor(paleBlue.r, paleBlue.g, paleBlue.b);
      pdf.roundedRect(marginLeft, y - 6, usableWidth, 20, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
      pdf.text("TOTAL DUE", marginLeft + 4, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);
      pdf.text(currency(totalCents), marginLeft + 60, y);
      pdf.setFontSize(8);
      pdf.text("Make payments to", marginLeft + 4, y + 6);
      pdf.text(businessName, marginLeft + 32, y + 6);
      if (hasContactName || hasPhone) {
        const contactLine = [contactName, hasPhone ? phone : null]
          .filter(Boolean)
          .join(" ");
        if (contactLine) {
          pdf.text(`Contact: ${contactLine}`, marginLeft + 4, y + 12);
        }
      }
    };

    addHeaderLogo();
    addInvoiceTitle();
    addClientBox();
    addInvoiceMeta();
    addBillTo();
    addTable();
    addFooter();

    const filename = invoiceNumber ? `Invoice ${invoiceNumber}.pdf` : "Invoice Preview.pdf";
    pdf.save(filename);
  }, [
    businessName,
    cityStateZip,
    client?.address,
    client?.name,
    client?.paymentTermsDays,
    contactName,
    formattedInvoiceDate,
    hasContactName,
    hasPhone,
    invoice?.invoiceDate,
    invoiceLineItems,
    invoiceNumber,
    loadRef,
    phone,
    street,
    totalCents,
    currency,
  ]);

  return (
    <div className="w-full max-w-md">
      <div
        ref={previewRef}
        className="bg-white text-black rounded-lg shadow-lg p-6"
      >
        <div
          className="text-sm text-gray-500 mb-2 font-medium"
          data-html2canvas-ignore="true"
        >
          Invoice Preview
        </div>

        <div className="mb-4">
          <div className="font-bold text-lg">{businessName}</div>
          {street && <div>{street}</div>}
          {cityStateZip && <div>{cityStateZip}</div>}
          {phone && <div>{phone}</div>}
        </div>
        
        <div className="flex justify-between text-sm mb-4">
          <div>
            <div className="text-gray-600">Invoice #</div>
            <div className="font-semibold">
              {invoiceNumber || (
                <span className="text-gray-400" data-html2canvas-ignore="true">
                  TBD
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Date</div>
            <div className="font-semibold">
              {formattedInvoiceDate || (
                <span className="text-gray-400" data-html2canvas-ignore="true">
                  —
                </span>
              )}
            </div>
          </div>
        </div>

        <hr className="my-3" />
        <div className="text-sm mb-3">
          <div className="font-semibold">Bill To</div>
          <div className="font-medium">
            {client?.name ? (
              client.name
            ) : (
              <span className="text-gray-400" data-html2canvas-ignore="true">
                —
              </span>
            )}
          </div>
        
          <div className="text-gray-600 whitespace-pre-line">
            {client?.address || ""}
          </div>
          {client?.paymentTermsDays && (
            <div className="text-gray-500 mt-1">Terms: Net {client.paymentTermsDays}</div>
          )}
        </div>
        <div
          className="text-sm mb-4"
          data-html2canvas-ignore={loadRef ? undefined : "true"}
        >
          <span className="font-medium">Load/Ref:</span>{" "}
          {loadRef || (
            <span className="text-gray-400" data-html2canvas-ignore="true">
              —
            </span>
          )}
        </div>

<table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1">Description</th>
              <th className="text-right py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceLineItems.map((item, index) => {
              const amount =
                typeof item.amountCents === "number" &&
                Number.isFinite(item.amountCents)
                  ? item.amountCents
                  : 0;
              const hasDescription = Boolean(item.description);
              const hasAmount = amount > 0;
              const hideRow = !item.isPrimary && !hasDescription && !hasAmount;
              if (hideRow) return null;

              return (
                <tr key={item.id || index}>
                  <td className="py-1 align-top">
                    {hasDescription ? (
                      item.description
                    ) : (
                      <span
                        className="text-gray-400"
                        data-html2canvas-ignore="true"
                      >
                        {item.isPrimary
                          ? "Describe the load…"
                          : "Add a description"}
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-right align-top">
                    {currency(amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t font-semibold">
            <tr>
              <td className="text-right py-1">Total</td>
              <td className="text-right py-1">{currency(totalCents)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-6 text-xs text-gray-500 italic">
          Make payments to {businessName}.
          {hasContactName || hasPhone ? (
            <>
              {" "}
              Feel free to reach out to {" "}
              {hasContactName ? contactName : null}
              {hasContactName && hasPhone ? ` @ ${phone}` : null}
              {!hasContactName && hasPhone ? `at ${phone}` : null} 
              {" "}for any inquiries or concerns.
            </>
          ) : (
            <span
              className="text-gray-400"
              data-html2canvas-ignore="true"
            >
              {" "}
              Feel free to reach out to your contact.
            </span>
          )}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors">
          Print
        </button>
        <button onClick={handleDownloadPdf} className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors">
          Download PDF
        </button>
      </div>
    </div>
  );
}
