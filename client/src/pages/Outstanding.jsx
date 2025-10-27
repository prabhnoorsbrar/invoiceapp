// Enhanced Outstanding.jsx with modern tiles and full invoice details
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((r) => (
          <div
            key={r._id}
            className="card w-full bg-base-100 shadow-sm border"
          >
            <div className="card-body">
              <span
                className={`badge badge-xs ${r.status === "paid" ? "badge-success" : "badge-error"}`}
              >
                {r.status.toUpperCase()}
              </span>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">#{r.invoiceNumber}</h2>
                <span className="text-sm font-medium text-gray-500">
                  {currency(r.amountCents)}
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-1 text-sm">
                <li>
                  <strong>Client:</strong> {r.client?.name || "-"}
                </li>
                <li>
                  <strong>Issued:</strong> {r.invoiceDate?.slice(0, 10) || "-"}
                </li>
                <li>
                  <strong>Due:</strong> {r.dueDate?.slice(0, 10) || "-"}
                </li>
                <li>
                  <strong>Description:</strong> {r.description || "-"}
                </li>
                <li>
                  <strong>Load Ref:</strong> {r.loadRef || "-"}
                </li>
                {r.paidDate && (
                  <li>
                    <strong>Paid:</strong> {r.paidDate?.slice(0, 10)}
                  </li>
                )}
              </ul>
              <div className="mt-4 flex flex-col gap-2">
                {r.status === "paid" ? (
                  <button
                    onClick={() => reopen(r._id)}
                    className="btn btn-warning btn-block btn-sm"
                  >
                    Unmark Paid
                  </button>
                ) : (
                  <button
                    onClick={() => markPaid(r._id)}
                    className="btn btn-success btn-block btn-sm"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => deleteInvoice(r._id)}
                  className="btn btn-error btn-block btn-sm"
                >
                  Delete
                </button>
              </div>
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
