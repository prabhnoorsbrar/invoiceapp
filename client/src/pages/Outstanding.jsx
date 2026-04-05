import React, { useEffect, useState, useRef, useMemo } from "react";
import { api } from "../api";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

function currency(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

const kpiStyles = {
  outstanding: { card: "bg-amber-500/[0.07] border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.07)]", label: "text-amber-400/60", value: "text-amber-300" },
  open:        { card: "bg-blue-500/[0.07] border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.07)]",  label: "text-blue-400/60",  value: "text-blue-300"  },
  ytd:         { card: "bg-emerald-500/[0.07] border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.07)]", label: "text-emerald-400/60", value: "text-emerald-300" },
};

function KPI({ label, value, sub, variant = "open" }) {
  const s = kpiStyles[variant];
  return (
    <div className={`backdrop-blur-sm rounded-2xl p-6 border flex flex-col gap-2 ${s.card}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${s.label}`}>{label}</p>
      <p className={`text-3xl font-extrabold ${s.value}`}>{value}</p>
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

function InvoiceCard({ r, onMarkPaid, onDelete, company, currentUser }) {
  const overdue = daysOverdue(r.dueDate);
  const isOverdue = overdue !== null && overdue > 0;
  const isDueToday = overdue === 0;

  return (
    <div className={`backdrop-blur-sm rounded-2xl border overflow-hidden flex flex-col transition-all ${
      isOverdue
        ? "bg-red-500/[0.08] border-red-500/30 hover:bg-red-500/[0.13] hover:border-red-500/50 shadow-[0_0_24px_rgba(239,68,68,0.10)] hover:shadow-[0_0_32px_rgba(239,68,68,0.18)]"
        : isDueToday
        ? "bg-amber-500/[0.08] border-amber-500/25 hover:bg-amber-500/[0.13] hover:border-amber-500/45 shadow-[0_0_24px_rgba(245,158,11,0.08)] hover:shadow-[0_0_32px_rgba(245,158,11,0.15)]"
        : "bg-white/[0.07] border-white/[0.12] hover:bg-white/[0.11] hover:border-white/[0.20] hover:shadow-2xl"
    }`}>
      {/* Accent bar */}
      <div className={`w-full h-[3px] ${isOverdue ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : isDueToday ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]" : "bg-primary/50"}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-base-content/40 font-semibold uppercase tracking-wider mb-1">Invoice</p>
            <p className="text-xl font-extrabold text-base-content leading-none">#{r.invoiceNumber}</p>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              isOverdue ? "bg-red-500/20 text-red-400 border-red-500/30" : isDueToday ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/[0.06] text-base-content/50 border-white/10"
            }`}>Outstanding</span>
            <p className="text-xl font-extrabold text-primary leading-none">{currency(r.amountCents)}</p>
          </div>
        </div>

        {/* Client */}
        <div className="bg-white/[0.06] rounded-xl px-3 py-2">
          <p className="text-xs text-base-content/40 mb-0.5">Client</p>
          <p className="text-sm font-semibold text-base-content truncate">{r.client?.name || "-"}</p>
        </div>

        {/* Description */}
        <p className="text-xs text-base-content/50 line-clamp-2 leading-relaxed">
          {r.description || <span className="italic">No description</span>}
        </p>

        {/* Dates */}
        <div className="flex justify-between text-xs text-base-content/40 border-t border-white/[0.08] pt-3">
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
      <div className={`flex gap-2 px-3 pb-3 pt-2 border-t ${isOverdue ? "border-red-500/20" : isDueToday ? "border-amber-500/20" : "border-white/[0.08]"}`}>
        <button
          onClick={() => generateInvoicePdf({ invoice: { ...r, lineItems: r.lineItems }, client: r.client, company, user: currentUser })}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-primary bg-primary/10 border border-primary/30 hover:bg-primary/25 hover:border-primary/50 active:bg-primary/35 transition-all duration-150"
          title="Download PDF"
        >
          ↓ PDF
        </button>
        <button
          onClick={() => onMarkPaid(r)}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-success bg-success/10 border border-success/30 hover:bg-success/25 hover:border-success/50 active:bg-success/35 transition-all duration-150"
        >
          Mark Paid
        </button>
        <button
          onClick={() => onDelete(r)}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-error bg-error/10 border border-error/30 hover:bg-error/25 hover:border-error/50 active:bg-error/35 transition-all duration-150"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function Outstanding({ company, currentUser }) {
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
        <KPI label="Total Outstanding" value={currency(kpi.outstandingTotalCents)} sub={`${kpi.outstandingCount} open invoice${kpi.outstandingCount !== 1 ? "s" : ""}`} variant="outstanding" />
        <KPI label="Open Invoices" value={String(kpi.outstandingCount)} variant="open" />
        <KPI label="YTD Collected" value={currency(kpi.ytdIncomeCents)} variant="ytd" />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={exportOutstanding} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all">Export Outstanding</button>
          <button onClick={exportYtd} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all">Export YTD</button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 pointer-events-none">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="input bg-white/[0.05] border border-white/10 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none text-sm w-44 pl-8 placeholder:text-base-content/25 transition-all"
              placeholder="Filter by client…"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
          </div>
          <select
            className="select bg-[#0f1117] border border-white/10 focus:border-primary/50 focus:outline-none text-sm text-base-content/70 transition-all"
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
        <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/[0.08] p-16 text-center">
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
              company={company}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {markPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-base-100/80 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl space-y-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-base-100/80 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl space-y-4">
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
