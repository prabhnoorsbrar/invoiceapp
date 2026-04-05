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
function toDateInput(iso) {
  if (!iso) return "";
  return String(iso).slice(0, 10);
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

function newLineItem(overrides = {}) {
  const id = overrides.id || `li-${Math.random().toString(36).slice(2, 10)}`;
  const amountCents = overrides.amountCents ?? null;
  return {
    id,
    description: overrides.description || "",
    amountCents,
    amountInput: typeof amountCents === "number" && Number.isFinite(amountCents) ? (amountCents / 100).toFixed(2) : "",
    isPrimary: overrides.isPrimary ?? false,
  };
}

function EditInvoiceModal({ invoice, onSave, onClose }) {
  // Seed line items from existing invoice, falling back to a single primary row
  const seedItems = () => {
    const existing = Array.isArray(invoice.lineItems) && invoice.lineItems.length
      ? invoice.lineItems
      : [{ id: "primary", description: invoice.description || "", amountCents: invoice.amountCents, isPrimary: true }];
    return existing.map((li) => newLineItem(li));
  };

  const [form, setForm] = useState({
    invoiceNumber: invoice.invoiceNumber || "",
    invoiceDate: toDateInput(invoice.invoiceDate),
    loadRef: invoice.loadRef || "",
  });
  const [lineItems, setLineItems] = useState(seedItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalCents = lineItems.reduce((s, li) => {
    const n = parseFloat(li.amountInput);
    return s + (Number.isFinite(n) ? Math.round(n * 100) : 0);
  }, 0);

  function updateLineItem(id, field, value) {
    setLineItems((prev) => prev.map((li) =>
      li.id === id ? { ...li, [field]: value } : li
    ));
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, newLineItem()]);
  }

  function removeLineItem(id) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const items = lineItems.map((li) => ({
        id: li.id,
        description: li.description.trim(),
        amountCents: Math.round(parseFloat(li.amountInput) * 100) || 0,
        isPrimary: li.isPrimary,
      })).filter((li) => li.description || li.amountCents);

      if (items.length === 0) { setError("Add at least one line item"); setSaving(false); return; }
      if (totalCents <= 0) { setError("Total must be greater than $0.00"); setSaving(false); return; }

      const primaryDesc = items.find((li) => li.isPrimary)?.description || items[0].description;

      const updated = await api.updateInvoice(invoice._id, {
        invoiceNumber: form.invoiceNumber.trim(),
        invoiceDate: form.invoiceDate,
        loadRef: form.loadRef.trim() || null,
        description: primaryDesc,
        amountCents: totalCents,
        lineItems: items,
      });
      onSave(updated);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100/80 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-bold">Edit Invoice</h2>
          <button onClick={onClose} className="text-base-content/40 hover:text-base-content transition-colors text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label pb-1"><span className="label-text font-semibold">Invoice #</span></label>
              <input className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} required />
            </div>
            <div className="form-control">
              <label className="label pb-1"><span className="label-text font-semibold">Invoice Date</span></label>
              <input type="date" className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={form.invoiceDate} onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))} required />
            </div>
          </div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Load Ref</span></label>
            <input className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" placeholder="Optional" value={form.loadRef} onChange={(e) => setForm((f) => ({ ...f, loadRef: e.target.value }))} />
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label-text font-semibold text-sm">Line Items</span>
              <button type="button" onClick={addLineItem} className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/30 text-xs font-bold text-primary hover:bg-primary/20 transition-colors">
                + Add Row
              </button>
            </div>

            {lineItems.map((li, idx) => (
              <div key={li.id} className="flex gap-2 items-start bg-white/[0.03] border border-white/[0.07] rounded-xl p-3">
                <div className="flex-1 space-y-2">
                  <input
                    className="input input-sm w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-3"
                    placeholder={idx === 0 ? "Description (e.g. Freight charges)" : "Description"}
                    value={li.description}
                    onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-base-content/40 text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input input-sm w-32 bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-3"
                      placeholder="0.00"
                      value={li.amountInput}
                      onChange={(e) => updateLineItem(li.id, "amountInput", e.target.value)}
                    />
                    {idx === 0 && (
                      <span className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">Primary</span>
                    )}
                  </div>
                </div>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(li.id)} className="mt-1 text-base-content/30 hover:text-error transition-colors text-lg leading-none shrink-0">✕</button>
                )}
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-end items-center gap-3 pt-1">
              <span className="text-xs text-base-content/40 font-semibold uppercase tracking-wider">Total</span>
              <span className={`text-lg font-extrabold ${totalCents > 0 ? "text-primary" : "text-base-content/30"}`}>
                {currency(totalCents)}
              </span>
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}

          <div className="flex gap-2 pt-2 border-t border-white/10 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm font-semibold hover:bg-white/[0.06] transition-colors" disabled={saving}>Cancel</button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-sm" /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvoiceCard({ r, onMarkPaid, onDelete, onEdit, company, currentUser, selected, onToggleSelect }) {
  const overdue = daysOverdue(r.dueDate);
  const isOverdue = overdue !== null && overdue > 0;
  const isDueToday = overdue === 0;

  return (
    <div className={`backdrop-blur-sm rounded-2xl border overflow-hidden flex flex-col transition-all ${
      selected
        ? "ring-2 ring-primary/60 " : ""
    }${
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
          <div className="flex items-start gap-2 min-w-0">
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => onToggleSelect(r._id)}
              className={`shrink-0 mt-0.5 w-4 h-4 rounded border transition-colors ${selected ? "bg-primary border-primary" : "border-white/30 hover:border-white/60 bg-white/[0.05]"}`}
              title={selected ? "Deselect" : "Select for bulk action"}
            >
              {selected && <svg viewBox="0 0 10 10" fill="none" className="w-full h-full p-[2px]"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </button>
            <div className="min-w-0">
              <p className="text-xs text-base-content/40 font-semibold uppercase tracking-wider mb-1">Invoice</p>
              <p className="text-xl font-extrabold text-base-content leading-none">#{r.invoiceNumber}</p>
            </div>
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
          onClick={() => onEdit(r)}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-base-content/60 bg-white/[0.05] border border-white/10 hover:bg-white/[0.12] hover:border-white/20 hover:text-base-content transition-all duration-150"
        >
          Edit
        </button>
        <button
          onClick={() => onMarkPaid(r)}
          className="flex-1 py-2 rounded-lg text-xs font-bold text-success bg-success/10 border border-success/30 hover:bg-success/25 hover:border-success/50 active:bg-success/35 transition-all duration-150"
        >
          Paid
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

export default function Outstanding({ company, currentUser, onCountChange }) {
  const [rows, setRows] = useState([]);
  const [kpi, setKpi] = useState({ outstandingTotalCents: 0, outstandingCount: 0, ytdIncomeCents: 0 });
  const [loading, setLoading] = useState(true);
  const [markPaidTarget, setMarkPaidTarget] = useState(null);
  const [paidDate, setPaidDate] = useState("");
  const [paidMethod, setPaidMethod] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [clientFilter, setClientFilter] = useState("");
  const [sortBy, setSortBy] = useState("oldest_due");
  const [selected, setSelected] = useState(new Set());
  const [bulkPaidOpen, setBulkPaidOpen] = useState(false);
  const [bulkPaidDate, setBulkPaidDate] = useState("");
  const [bulkPaidMethod, setBulkPaidMethod] = useState("");
  const [bulkMarking, setBulkMarking] = useState(false);
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
      onCountChange?.(kpiData.outstandingCount);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

  async function confirmBulkPaid() {
    if (!bulkPaidDate || selected.size === 0) return;
    setBulkMarking(true);
    try {
      await Promise.all([...selected].map((id) => api.markPaid(id, { paidDate: bulkPaidDate, paymentMethod: bulkPaidMethod || undefined })));
      setSelected(new Set());
      setBulkPaidOpen(false);
      loadData();
    } catch (err) { console.error(err); }
    finally { setBulkMarking(false); }
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

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <button onClick={exportOutstanding} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all">Export Outstanding</button>
        <button onClick={exportYtd} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all">Export YTD</button>

        {selected.size > 0 && (
          <>
            <div className="w-px h-5 bg-white/10" />
            <button
              onClick={() => { setBulkPaidDate(todayStr()); setBulkPaidMethod(""); setBulkPaidOpen(true); }}
              className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-sm font-semibold text-success hover:bg-success/20 hover:border-success/50 transition-all"
            >
              Mark {selected.size} as Paid
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-base-content/40 hover:text-base-content transition-colors"
            >
              Clear
            </button>
          </>
        )}

        <div className="w-px h-5 bg-white/10 hidden sm:block" />

        <div className="relative flex-1 min-w-36">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 pointer-events-none">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input w-full bg-white/[0.05] border border-white/10 focus:border-primary/50 focus:bg-white/[0.08] focus:outline-none text-sm pl-8 placeholder:text-base-content/25 transition-all"
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
              onMarkPaid={(r) => { setMarkPaidTarget(r); setPaidDate(todayStr()); setPaidMethod(""); }}
              onDelete={setDeleteTarget}
              onEdit={setEditTarget}
              company={company}
              currentUser={currentUser}
              selected={selected.has(r._id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Single mark paid modal */}
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

      {/* Bulk mark paid modal */}
      {bulkPaidOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-base-100/80 backdrop-blur-xl rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-bold text-base-content">Mark {selected.size} Invoice{selected.size !== 1 ? "s" : ""} as Paid</h3>
              <p className="text-sm text-base-content/40 mt-1">All selected invoices will be marked paid with the same date.</p>
            </div>
            <div className="form-control">
              <label className="label pb-1"><span className="label-text">Paid Date</span></label>
              <input type="date" className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none" value={bulkPaidDate} onChange={(e) => setBulkPaidDate(e.target.value)} />
            </div>
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text">Payment Method <span className="text-base-content/30 text-xs">(optional)</span></span>
              </label>
              <input className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none" placeholder="Wire, Cheque…" value={bulkPaidMethod} onChange={(e) => setBulkPaidMethod(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors" onClick={() => setBulkPaidOpen(false)} disabled={bulkMarking}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-success text-success-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" onClick={confirmBulkPaid} disabled={!bulkPaidDate || bulkMarking}>
                {bulkMarking ? <span className="loading loading-spinner loading-sm" /> : `Mark ${selected.size} Paid`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
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

      {/* Edit invoice modal */}
      {editTarget && (
        <EditInvoiceModal
          invoice={editTarget}
          onSave={(updated) => {
            setRows((prev) => prev.map((r) => r._id === updated._id ? { ...updated, client: updated.client || r.client } : r));
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
