import React, { useState } from "react";
import { api } from "../api";

function currency(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Search() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);

  async function run() {
    setRows(await api.search(q));
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search invoice #, ref, or description"
          className="flex-1 border p-2 rounded"
        />
        <button
          onClick={run}
          className="bg-blue-600 text-white px-3 py-2 rounded"
        >
          Search
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Invoice #</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Invoice Date</th>
              <th className="text-left p-2">Paid Date</th>
              <th className="text-left p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="border-b">
                <td className="p-2">{r.invoiceNumber}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-right">{currency(r.amountCents)}</td>
                <td className="p-2">{r.invoiceDate?.slice(0, 10)}</td>
                <td className="p-2">{r.paidDate?.slice(0, 10) || "—"}</td>
                <td className="p-2 truncate max-w-xs" title={r.description}>
                  {r.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
