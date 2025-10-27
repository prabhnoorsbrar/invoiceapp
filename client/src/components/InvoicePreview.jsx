// Updated InvoicePreview.jsx with better styling and dynamic invoice number
import React from "react";

export default function InvoicePreview({ company, client, invoice }) {
  const currency = (cents) =>
    (cents ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d) ? "—" : d.toISOString().slice(0, 10);
  };

  return (
    <div className="bg-white text-black rounded-lg shadow-lg p-6 w-full max-w-md">
      <div className="text-sm text-gray-500 mb-2 font-medium">Invoice Preview</div>

      <div className="mb-4">
        <div className="font-bold text-lg">US PRIDE LOGISTICS INC</div>
        <div>3637 Massimo Circle</div>
        <div>Stockton, CA 95212</div>
      </div>

      <div className="flex justify-between text-sm mb-4">
        <div>
          <div className="text-gray-600">Invoice #</div>
          <div className="font-semibold">{invoice.invoiceNumber || "TBD"}</div>
        </div>
        <div>
          <div className="text-gray-600">Date</div>
          <div className="font-semibold">{formatDate(invoice.invoiceDate)}</div>
        </div>
      </div>

      <hr className="my-3" />

      <div className="text-sm mb-3">
        <div className="font-semibold">Bill To</div>
        <div className="font-medium">{client?.name || "—"}</div>
        <div className="text-gray-600 whitespace-pre-line">{client?.address || ""}</div>
        {client?.paymentTermsDays && (
          <div className="text-gray-500 mt-1">Terms: Net {client.paymentTermsDays}</div>
        )}
      </div>

      <div className="text-sm mb-4">
        <span className="font-medium">Load/Ref:</span> {invoice.loadRef || "—"}
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
            <td className="py-1 align-top">{invoice.description || <span className="text-gray-400">Describe the load…</span>}</td>
            <td className="py-1 text-right align-top">{currency(invoice.amountCents)}</td>
          </tr>
        </tbody>
        <tfoot className="border-t font-semibold">
          <tr>
            <td className="text-right py-1">Total</td>
            <td className="text-right py-1">{currency(invoice.amountCents)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 flex gap-2 text-sm">
        <button onClick={() => window.print()} className="btn btn-outline btn-sm">
          Print
        </button>
        <button className="btn btn-sm">Download PDF</button>
      </div>
    </div>
  );
}