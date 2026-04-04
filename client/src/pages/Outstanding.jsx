import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";

function currency(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

export default function Outstanding() {
  const [rows, setRows] = useState([]);
  const [kpi, setKpi] = useState({ outstandingTotalCents: 0, outstandingCount: 0, ytdIncomeCents: 0 });
  const [loading, setLoading] = useState(true);

  // Mark paid modal
  const [markPaidTarget, setMarkPaidTarget] = useState(null);
  const [paidDate, setPaidDate] = useState("");
  const [paidMethod, setPaidMethod] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const intervalRef = useRef(null);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadData() {
    try {
      const [data, kpiData] = await Promise.all([api.listOutstanding(), api.kpis()]);
      setRows(data);
      setKpi(kpiData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openMarkPaid(invoice) {
    setMarkPaidTarget(invoice);
    setPaidDate(new Date().toISOString().slice(0, 10));
    setPaidMethod("");
  }

  async function confirmMarkPaid() {
    if (!markPaidTarget || !paidDate) return;
    setMarkingPaid(true);
    try {
      await api.markPaid(markPaidTarget._id, { paidDate, paymentMethod: paidMethod || undefined });
      setMarkPaidTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingPaid(false);
    }
  }

  function openDelete(invoice) {
    setDeleteTarget(invoice);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deleteTarget._id);
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  function downloadCsv(filename, headers, records) {
    const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.map(escapeCell).join(","), ...records.map((row) => row.map(escapeCell).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportOutstandingInvoices() {
    downloadCsv(
      "outstanding-invoices.csv",
      ["client_name", "invoice_number", "issue_date", "amount", "status"],
      rows.map((r) => [r.client?.name || "-", r.invoiceNumber || "-", formatDate(r.invoiceDate), currency(r.amountCents), r.status || "-"])
    );
  }

  async function exportYtdInvoices() {
    const allInvoices = await api.search("");
    const currentYear = new Date().getFullYear();
    const ytd = allInvoices.filter((r) => r.invoiceDate && new Date(r.invoiceDate).getFullYear() === currentYear);
    const totalCents = ytd.reduce((sum, r) => sum + (r.amountCents || 0), 0);
    downloadCsv(
      "ytd-invoices.csv",
      ["client_name", "invoice_number", "issue_date", "amount", "status", "paid_date"],
      [
        ...ytd.map((r) => [r.client?.name || "-", r.invoiceNumber || "-", formatDate(r.invoiceDate), currency(r.amountCents), r.status || "-", r.status === "paid" ? formatDate(r.paidDate) : "N/A"]),
        ["TOTAL", "", "", currency(totalCents), "", ""],
      ]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={exportOutstandingInvoices} className="btn btn-success btn-sm">Export Outstanding</button>
        <button onClick={exportYtdInvoices} className="btn btn-success btn-sm">Export YTD</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <KPI label="Outstanding" value={currency(kpi.outstandingTotalCents)} />
        <KPI label="Open Count" value={String(kpi.outstandingCount)} />
        <KPI label="YTD Income (Cash)" value={currency(kpi.ytdIncomeCents)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-500">
          No outstanding invoices.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={r._id} className="card w-full bg-base-100 shadow-sm border">
              <div className="card-body">
                <span className="badge badge-xs badge-error">OUTSTANDING</span>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold">#{r.invoiceNumber}</h2>
                  <span className="text-sm font-medium text-gray-500">{currency(r.amountCents)}</span>
                </div>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  <li><strong>Client:</strong> {r.client?.name || "-"}</li>
                  <li><strong>Issued:</strong> {formatDate(r.invoiceDate)}</li>
                  <li><strong>Due:</strong> {formatDate(r.dueDate)}</li>
                  <li><strong>Description:</strong> {r.description || "-"}</li>
                  <li><strong>Load Ref:</strong> {r.loadRef || "-"}</li>
                </ul>
                <div className="mt-4 flex flex-col gap-2">
                  <button onClick={() => openMarkPaid(r)} className="btn btn-success btn-block btn-sm">Mark Paid</button>
                  <button onClick={() => openDelete(r)} className="btn btn-error btn-outline btn-block btn-sm">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Mark Invoice Paid</h3>
            <p className="text-sm text-gray-500">Invoice #{markPaidTarget.invoiceNumber} — {markPaidTarget.client?.name}</p>
            <div className="form-control">
              <label className="label text-sm font-medium">Paid Date</label>
              <input
                type="date"
                className="input input-bordered"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label text-sm font-medium">Payment Method <span className="text-xs text-gray-400 ml-1">(optional)</span></label>
              <input
                className="input input-bordered"
                placeholder="e.g. Wire, Cheque"
                value={paidMethod}
                onChange={(e) => setPaidMethod(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-ghost" onClick={() => setMarkPaidTarget(null)} disabled={markingPaid}>Cancel</button>
              <button className="btn btn-success" onClick={confirmMarkPaid} disabled={!paidDate || markingPaid}>
                {markingPaid ? <span className="loading loading-spinner loading-sm" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Delete Invoice?</h3>
            <p className="text-sm text-gray-600">
              Invoice <strong>#{deleteTarget.invoiceNumber}</strong> for <strong>{deleteTarget.client?.name}</strong> ({currency(deleteTarget.amountCents)}) will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-error" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <span className="loading loading-spinner loading-sm" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
