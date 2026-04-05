import React from "react";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

export default function InvoicePreview({ company, user, client, invoice }) {
  const previewRef = React.useRef(null);
  const currency = (valueInCents) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((valueInCents ?? 0) / 100);

  const formatDate = (iso) => {
    if (!iso) return null;
    const parts = String(iso).slice(0, 10).split("-");
    if (parts.length !== 3) return null;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  const parseAddress = (addressStr) => {
    if (!addressStr) return { street: "", cityStateZip: "" };
    const cleaned = addressStr.replace(/\s+,/g, ",").trim();
    const lines = cleaned.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    let street = "", cityStateZip = "";
    if (lines.length >= 2) {
      street = lines[0]; cityStateZip = lines[1];
    } else {
      const [, s1 = "", s2 = ""] = cleaned.match(/^([^,]+),(.*)$/) || [];
      if (s2) { street = s1.trim(); cityStateZip = s2.trim().replace(/^,/, "").trim(); }
      else { street = cleaned; }
    }
    const m = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (m) { const [, city, st, zip] = m; cityStateZip = `${city.trim()}, ${st} ${zip}`; }
    return { street, cityStateZip };
  };

  const businessName =
    (company?.name && company.name.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Company name";

  const addressStr = company?.address?.trim() || user?.address?.trim() || "";
  const { street, cityStateZip } = parseAddress(addressStr);
  const phone = user?.phone?.trim() || company?.phone?.trim() || "";
  const contactName = [user?.firstName, user?.lastName].map((p) => p?.trim()).filter(Boolean).join(" ");
  const invoiceNumber = invoice?.invoiceNumber ? String(invoice.invoiceNumber).trim() : "";
  const formattedInvoiceDate = formatDate(invoice?.invoiceDate);
  const loadRef = invoice?.loadRef?.trim() || "";
  const hasContactName = Boolean(contactName);
  const hasPhone = Boolean(phone);

  const invoiceLineItems = React.useMemo(() => {
    if (Array.isArray(invoice?.lineItems) && invoice.lineItems.length) {
      return invoice.lineItems.map((item, index) => ({
        id: item?.id || `line-${index}`,
        description: item?.description || "",
        amountCents: typeof item?.amountCents === "number" && Number.isFinite(item.amountCents) ? item.amountCents : null,
        isPrimary: item?.isPrimary ?? index === 0,
      }));
    }
    if (invoice?.description) {
      return [{ id: "primary", description: invoice.description, amountCents: typeof invoice?.amountCents === "number" && Number.isFinite(invoice.amountCents) ? invoice.amountCents : null, isPrimary: true }];
    }
    return [{ id: "primary", description: "", amountCents: typeof invoice?.amountCents === "number" && Number.isFinite(invoice.amountCents) ? invoice.amountCents : null, isPrimary: true }];
  }, [invoice]);

  const totalCents = React.useMemo(() => {
    if (typeof invoice?.amountCents === "number" && Number.isFinite(invoice.amountCents)) return invoice.amountCents;
    return invoiceLineItems.reduce((sum, item) => sum + (typeof item.amountCents === "number" ? item.amountCents : 0), 0);
  }, [invoice, invoiceLineItems]);

  const handleDownloadPdf = React.useCallback(() => {
    generateInvoicePdf({ invoice, client, company, user });
  }, [invoice, client, company, user]);

  return (
    <div className="w-full max-w-md">
      <div ref={previewRef} className="bg-white text-black rounded-lg shadow-lg p-6">
        <div className="text-sm text-gray-500 mb-2 font-medium" data-html2canvas-ignore="true">
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
              {invoiceNumber || <span className="text-gray-400" data-html2canvas-ignore="true">TBD</span>}
            </div>
          </div>
          <div>
            <div className="text-gray-600">Date</div>
            <div className="font-semibold">
              {formattedInvoiceDate || <span className="text-gray-400" data-html2canvas-ignore="true">—</span>}
            </div>
          </div>
        </div>

        <hr className="my-3" />
        <div className="text-sm mb-3">
          <div className="font-semibold">Bill To</div>
          <div className="font-medium">
            {client?.name ? client.name : <span className="text-gray-400" data-html2canvas-ignore="true">—</span>}
          </div>
          <div className="text-gray-600 whitespace-pre-line">{client?.address || ""}</div>
          {client?.paymentTermsDays && <div className="text-gray-500 mt-1">Terms: Net {client.paymentTermsDays}</div>}
        </div>

        <div className="text-sm mb-4" data-html2canvas-ignore={loadRef ? undefined : "true"}>
          <span className="font-medium">Load/Ref:</span>{" "}
          {loadRef || <span className="text-gray-400" data-html2canvas-ignore="true">—</span>}
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
              const amount = typeof item.amountCents === "number" && Number.isFinite(item.amountCents) ? item.amountCents : 0;
              const hasDescription = Boolean(item.description);
              const hasAmount = amount > 0;
              const hideRow = !item.isPrimary && !hasDescription && !hasAmount;
              if (hideRow) return null;
              return (
                <tr key={item.id || index}>
                  <td className="py-1 align-top">
                    {hasDescription ? item.description : (
                      <span className="text-gray-400" data-html2canvas-ignore="true">
                        {item.isPrimary ? "Describe the load…" : "Add a description"}
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-right align-top">{currency(amount)}</td>
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
            <> Feel free to reach out to {hasContactName ? contactName : null}{hasContactName && hasPhone ? ` @ ${phone}` : null}{!hasContactName && hasPhone ? `at ${phone}` : null} for any inquiries or concerns.</>
          ) : (
            <span className="text-gray-400" data-html2canvas-ignore="true"> Feel free to reach out to your contact.</span>
          )}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => window.print()} className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity">
          Print
        </button>
        <button onClick={handleDownloadPdf} className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity">
          Download PDF
        </button>
      </div>
    </div>
  );
}
