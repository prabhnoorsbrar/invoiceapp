import React, { useEffect, useState, useRef, useMemo } from "react";
import { api } from "../api";

function currency(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

function KPI({ label, value, sub }) {
  return (
    <div className="bg-base-100 rounded-2xl p-6 border border-base-300 flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-base-content/40">{label}</p>
      <p className="text-3xl font-extrabold text-base-content">{value}</p>
      {sub && <p className="text-xs text-base-content/30">{sub}</p>}
    </div>
  );
}

function daysOverdue(dueDate) {
  if (!dueDate) return null;
  const [y, m, d] = dueDate.slice(0, 10).split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today - due) / (1000 * 60 * 60 * 24));
}

function InvoiceCard({ r, onMarkPaid, onDelete }) {
  const overdue = daysOverdue(r.dueDate);
  const isOverdue = overdue !== null && overdue > 0;
  const isDueToday = overdue === 0;

  return (
    <div className={`bg-base-100 rounded-2xl border overflow-hidden flex flex-col transition-all hover:shadow-lg ${isOverdue ? "border-error/60 hover:border-error/80" : "border-base-300 hover:border-base-content/20"}`}>
      {/* Accent bar */}
      <div className={`w-full ${isOverdue ? "h-1.5 bg-error" : "h-1 bg-error/70"}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-base-content/40 font-semibold uppercase tracking-wider mb-1">Invoice</p>
            <p className="text-xl font-extrabold text-base-content leading-none">#{r.invoiceNumber}</p>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error/20 text-error border border-error/30">Outstanding</span>
            <p className="text-xl font-extrabold text-primary leading-none">{currency(r.amountCents)}</p>
          </div>
        </div>

        {/* Client */}
        <div className="bg-base-200 rounded-xl px-3 py-2">
          <p className="text-xs text-base-content/40 mb-0.5">Client</p>
          <p className="text-sm font-semibold text-base-content truncate">{r.client?.name || "-"}</p>
        </div>

        {/* Description */}
        <p className="text-xs text-base-content/50 line-clamp-2 leading-relaxed">
          {r.description || <span className="italic">No description</span>}
        </p>

        {/* Dates */}
        <div className="flex justify-between text-xs text-base-content/40 border-t border-base-300 pt-3">
          <div>
            <p className="font-semibold text-base-content/30 uppercase tracking-wider text-[10px]">Issued</p>
            <p className="text-base-content/60 font-medium mt-0.5">{formatDate(r.invoiceDate)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-base-content/30 uppercase tracking-wider text-[10px]">Due</p>
            <p className="text-base-content/60 font-medium mt-0.5">{formatDate(r.dueDate)}</p>
          </div>
        </div>

        {/* Overdue indicator */}
        {isOverdue && (
          <div className="flex items-center gap-1.5 bg-error/10 border border-error/30 rounded-lg px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
            <p className="text-xs font-bold text-error">{overdue} day{overdue !== 1 ? "s" : ""} overdue</p>
          </div>
        )}
        {isDueToday && (
          <div className="flex items-center gap-1.5 bg-warning/10 border border-warning/30 rounded-lg px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
            <p className="text-xs font-bold text-warning">Due today</p>
          </div>
        )}

        {r.loadRef && (
          <p className="text-xs text-base-content/30">
            <span className="uppercase tracking-wider text-[10px] font-bold">Ref</span>{" "}
            {r.loadRef}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 border-t border-base-300 divide-x divide-base-300">
        <button
          onClick={() => onMarkPaid(r)}
          className="py-3 text-sm font-bold text-success bg-success/15 hover:bg-success/25 transition-colors"
        >
          Mark Paid
        </button>
        <button
          onClick={() => onDelete(r)}
          className="py-3 text-sm font-bold text-error bg-error/15 hover:bg-error/25 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Outstanding() {
  const [rows, setRows] = useState([]);
  const [kpi, setKpi] = useState({ outstandingTotalCents: 0, outstandingCount: 0, ytdIncomeCents: 0 });
  const [loading, setLoading] = useState(true);
  const [markPaidTarget, setMarkPaidTarget] = useState(null);
  const [paidDate, setPaidDate] = useState("");
  const [paidMethod, setPaidMethod] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [clientFilter, setClientFilter] = useState("");
  const [sortBy, setSortBy] = useState("oldest_due");
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function confirmMarkPaid() {
    if (!markPaidTarget || !paidDate) return;
    setMarkingPaid(true);
    try {
      await api.markPaid(markPaidTarget._id, { paidDate, paymentMethod: paidMethod || undefined });
      setMarkPaidTarget(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setMarkingPaid(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deleteTarget._id);
      setDeleteTarget(null);
      loadData();
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  }

  function downloadCsv(filename, headers, records) {
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.map(esc).join(","), ...records.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const displayRows = useMemo(() => {
    let filtered = rows;
    if (clientFilter.trim()) {
      const f = clientFilter.toLowerCase();
      filtered = rows.filter((r) => r.client?.name?.toLowerCase().includes(f));
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest_due": return (a.dueDate || "") < (b.dueDate || "") ? -1 : 1;
        case "newest_due": return (a.dueDate || "") > (b.dueDate || "") ? -1 : 1;
        case "amount_desc": return (b.amountCents || 0) - (a.amountCents || 0);
        case "client_az": return (a.client?.name || "").localeCompare(b.client?.name || "");
        default: return 0;
      }
    });
  }, [rows, clientFilter, sortBy]);

  function exportOutstanding() {
    downloadCsv("outstanding-invoices.csv",
      ["Invoice #", "Client", "Issued", "Due", "Amount"],
      rows.map((r) => [r.invoiceNumber, r.client?.name || "-", formatDate(r.invoiceDate), formatDate(r.dueDate), currency(r.amountCents)])
    );
  }

  async function exportYtd() {
    const all = await api.search("");
    const yr = new Date().getFullYear();
    const yearStart = new Date(yr, 0, 1);
    const ytd = all.filter((r) =>
      r.status === "paid" && r.paidDate && new Date(r.paidDate) >= yearStart
    );
    const total = ytd.reduce((s, r) => s + (r.amountCents || 0), 0);
    downloadCsv(`ytd-paid-${yr}.csv`,
      ["Invoice #", "Client", "Invoice Date", "Paid Date", "Amount"],
      [...ytd.map((r) => [r.invoiceNumber, r.client?.name || "-", formatDate(r.invoiceDate), formatDate(r.paidDate), currency(r.amountCents)]),
       ["TOTAL", "", "", "", currency(total)]]
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI label="Total Outstanding" value={currency(kpi.outstandingTotalCents)} sub={`${kpi.outstandingCount} open invoice${kpi.outstandingCount !== 1 ? "s" : ""}`} />
        <KPI label="Open Invoices" value={String(kpi.outstandingCount)} />
        <KPI label="YTD Collected" value={currency(kpi.ytdIncomeCents)} />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={exportOutstanding} className="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity">Export Outstanding</button>
          <button onClick={exportYtd} className="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity">Export YTD</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            className="input bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none text-sm w-44"
            placeholder="Filter by client…"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          />
          <select
            className="select bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="oldest_due">Oldest Due First</option>
            <option value="newest_due">Newest Due First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="client_az">Client A–Z</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : displayRows.length === 0 ? (
        <div className="bg-base-100 rounded-2xl border border-base-300 p-16 text-center">
          <p className="text-base-content/30 text-sm">{rows.length === 0 ? "No outstanding invoices" : "No invoices match your filter"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayRows.map((r) => (
            <InvoiceCard
              key={r._id}
              r={r}
              onMarkPaid={(r) => { setMarkPaidTarget(r); setPaidDate((() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()); setPaidMethod(""); }}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-base-100 rounded-2xl p-6 w-full max-w-sm border border-base-300 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-base-content">Mark as Paid</h3>
              <p className="text-sm text-base-content/40 mt-1">#{markPaidTarget.invoiceNumber} · {markPaidTarget.client?.name} · {currency(markPaidTarget.amountCents)}</p>
            </div>
            <div className="form-control">
              <label className="label pb-1"><span className="label-text">Paid Date</span></label>
              <input type="date" className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text">Payment Method <span className="text-base-content/30 text-xs">(optional)</span></span>
              </label>
              <input className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none" placeholder="Wire, Cheque…" value={paidMethod} onChange={(e) => setPaidMethod(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors" onClick={() => setMarkPaidTarget(null)} disabled={markingPaid}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-success text-success-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" onClick={confirmMarkPaid} disabled={!paidDate || markingPaid}>
                {markingPaid ? <span className="loading loading-spinner loading-sm" /> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-base-100 rounded-2xl p-6 w-full max-w-sm border border-base-300 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-base-content">Delete Invoice?</h3>
            <p className="text-sm text-base-content/50">
              <strong>#{deleteTarget.invoiceNumber}</strong> · {deleteTarget.client?.name} · {currency(deleteTarget.amountCents)} will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-error text-error-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <span className="loading loading-spinner loading-sm" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
