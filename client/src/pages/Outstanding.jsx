import React, { useEffect, useState } from "react";
import { api } from "../api";

function currency(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function Outstanding() {
  const [rows, setRows] = useState([]);
  const [kpi, setKpi] = useState({
    outstandingTotalCents: 0,
    outstandingCount: 0,
    ytdIncomeCents: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await api.listOutstanding();
      setRows(data);
      setKpi(await api.kpis());
    } catch (err) {
      console.error(err);
    }
  }

  async function markPaid(id) {
    const paidDate = prompt(
      "Paid date (YYYY-MM-DD):",
      new Date().toISOString().slice(0, 10)
    );
    if (!paidDate) return;
    await api.markPaid(id, { paidDate });
    loadData();
  }

  async function reopen(id) {
    if (!window.confirm("Unmark as paid?")) return;
    await api.reopen(id);
    loadData();
  }

  async function deleteInvoice(id) {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    await fetch(`${import.meta.env.VITE_API_BASE}/api/invoices/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("jwt")}`,
      },
    });
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <KPI label="Outstanding" value={currency(kpi.outstandingTotalCents)} />
        <KPI label="Open Count" value={String(kpi.outstandingCount)} />
        <KPI label="YTD Income (Cash)" value={currency(kpi.ytdIncomeCents)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div
            key={r._id}
            className="card bg-base-100 shadow-md border p-4 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <h2 className="card-title">#{r.invoiceNumber}</h2>
              <span
                className={`badge ${r.datePaid ? "badge-success" : "badge-error"}`}
              >
                {r.datePaid ? "Paid" : "Unpaid"}
              </span>
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-line mt-2">
              {r.client?.name}
              <br />
              {r.client?.address}
            </div>
            <div className="text-sm mt-1">
              <strong>Amount:</strong> {currency(r.amountCents)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Issued {r.invoiceDate?.slice(0, 10)} • Due {r.dueDate?.slice(0, 10)}
            </div>
            <div className="card-actions justify-end mt-3 flex-wrap gap-2">
              {r.datePaid ? (
                <button
                  onClick={() => reopen(r._id)}
                  className="btn btn-warning btn-sm"
                >
                  Unmark Paid
                </button>
              ) : (
                <button
                  onClick={() => markPaid(r._id)}
                  className="btn btn-success btn-sm"
                >
                  Mark Paid
                </button>
              )}
              <button
                onClick={() => deleteInvoice(r._id)}
                className="btn btn-error btn-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPI({ label, value }) {
  return (
    <div className="border rounded-xl p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
