// Updated InvoicePreview.jsx with better styling and dynamic invoice number
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
  const businessName =
    (company?.name && company.name.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Company name";

  const addressLines = user?.address
    ? user.address
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  const phone = user?.phone?.trim();
  const amountCents = invoice?.amountCents ?? 0;


  return (
    <div className="bg-white text-black rounded-lg shadow-lg p-6 w-full max-w-md">
      <div className="text-sm text-gray-500 mb-2 font-medium">
        Invoice Preview
      </div>

      <div className="mb-4">
        <div className="font-bold text-lg">{businessName}</div>
        {addressLines.length ? (
          addressLines.map((line, idx) => <div key={`${line}-${idx}`}>{line}</div>)
        ) : (
          <div className="text-gray-400">Add your company address</div>
        )}
        {phone && <div>{phone}</div>}
      </div>

      <div className="flex justify-between text-sm mb-4">
        <div>
          <div className="text-gray-600">Invoice #</div>
          <div className="font-semibold">{invoice?.invoiceNumber || "TBD"}</div>
        </div>
        <div>
          <div className="text-gray-600">Date</div>
          <div className="font-semibold">{formatDate(invoice?.invoiceDate)}</div>
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
            <td className="py-1 text-right align-top">{currency(amountCents)}</td>
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
    </div>
  );
}