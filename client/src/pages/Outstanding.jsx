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
  (async () => {
    try {
      const data = await api.listOutstanding();
      setRows(data);
      setKpi(await api.kpis());
    } catch (err) {
      console.error(err);
      // e.g., redirect to a login page or show a message if unauthorized
    }
  })();
}, []);

  async function markPaid(id) {
    const paidDate = prompt(
      "Paid date (YYYY-MM-DD):",
      new Date().toISOString().slice(0, 10)
    );
    if (!paidDate) return;
    await api.markPaid(id, { paidDate });
    setRows(await api.listOutstanding());
    setKpi(await api.kpis());
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
            className="border rounded-xl p-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between font-semibold">
                <span>{r.invoiceNumber}</span>
                <span>{currency(r.amountCents)}</span>
              </div>
              <div className="text-sm text-gray-500">{r.description}</div>
              <div className="text-xs text-gray-400 mt-1">
                Issued {r.invoiceDate?.slice(0, 10)} • Due{" "}
                {r.dueDate?.slice(0, 10)}
              </div>
            </div>
            <button
              onClick={() => markPaid(r._id)}
              className="bg-green-600 text-white px-3 py-1 mt-2 rounded"
            >
              Mark Paid
            </button>
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
