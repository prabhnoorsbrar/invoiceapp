// Updated InvoicePreview.jsx with better styling and dynamic invoice number
// Updated InvoicePreview.jsx with formatted address parsing
import React from "react";

export default function InvoicePreview({ company, user, client, invoice }) {
  const currency = (valueInCents) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format((valueInCents ?? 0) / 100);

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d) ? "—" : d.toISOString().slice(0, 10);
  };

  // --- Address parsing helper ---
  const parseAddress = (addressStr) => {
    if (!addressStr) return { street: "", cityStateZip: "" };
    const cleaned = addressStr.replace(/\s+,/g, ",").trim();
    const lines = cleaned.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    let street = "", cityStateZip = "";

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

  const addressStr = (company?.address?.trim() || user?.address?.trim() || "");
  const { street, cityStateZip } = parseAddress(addressStr);

  const phone = user?.phone?.trim() || company?.phone?.trim() || "";
  const contactName = [user?.firstName, user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const amountCents = invoice?.amountCents ?? 0;

  return (
    <div className="bg-white text-black rounded-lg shadow-lg p-6 w-full max-w-md">
      <div className="text-sm text-gray-500 mb-2 font-medium">
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
          <div className="font-semibold">{invoice?.invoiceNumber || "TBD"}</div>
        </div>
        <div>
          <div className="text-gray-600">Date</div>
          <div className="font-semibold">
            {formatDate(invoice?.invoiceDate)}
          </div>
        </div>
      </div>

      <hr className="my-3" />

      <div className="text-sm mb-3">
        <div className="font-semibold">Bill To</div>
        <div className="font-medium">{client?.name || "—"}</div>
        <div className="text-gray-600 whitespace-pre-line">
          {client?.address || ""}
        </div>
        {client?.paymentTermsDays && (
          <div className="text-gray-500 mt-1">
            Terms: Net {client.paymentTermsDays}
          </div>
        )}
      </div>

      <div className="text-sm mb-4">
        <span className="font-medium">Load/Ref:</span> {invoice?.loadRef || "—"}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1">Description</th>
            <th className="text-right py-1">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 align-top">
              {invoice?.description || (
                <span className="text-gray-400">Describe the load…</span>
              )}
            </td>
            <td className="py-1 text-right align-top">
              {currency(amountCents)}
            </td>
          </tr>
        </tbody>
        <tfoot className="border-t font-semibold">
          <tr>
            <td className="text-right py-1">Total</td>
            <td className="text-right py-1">{currency(amountCents)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          onClick={() => window.print()}
          className="btn btn-outline btn-sm"
        >
          Print
        </button>
        <button className="btn btn-sm">Download PDF</button>
      </div>
      <p className="mt-6 text-xs text-gray-500 italic">
        Make payments to {businessName}. Feel free to reach out to{" "}
        {contactName || "your contact"}
        {phone ? ` @ ${phone}` : ""}.
      </p>
    </div>
  );
}
