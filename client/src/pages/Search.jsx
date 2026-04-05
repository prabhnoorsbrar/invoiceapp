import React, { useState } from "react";
import { api } from "../api";

function currency(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
function formatDate(value, fallback = "-") {
  if (!value) return fallback;
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${m}/${d}/${y}`;
}

function InvoiceCard({ r, onReopen, onDelete, onDuplicate }) {
  const isPaid = r.status === "paid";
  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden flex flex-col hover:border-base-content/20 transition-all hover:shadow-lg">
      <div className={`h-1 w-full ${isPaid ? "bg-success/70" : "bg-error/70"}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-base-content/40 font-semibold uppercase tracking-wider mb-1">Invoice</p>
            <p className="text-xl font-extrabold text-base-content leading-none">#{r.invoiceNumber}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-base-content/40 font-semibold uppercase tracking-wider mb-1">Amount</p>
            <p className="text-xl font-extrabold text-primary leading-none">{currency(r.amountCents)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="bg-base-200 rounded-xl px-3 py-2 flex-1 min-w-0 mr-2">
            <p className="text-xs text-base-content/40 mb-0.5">Client</p>
            <p className="text-sm font-semibold text-base-content truncate">{r.client?.name || "-"}</p>
          </div>
          <span className={`badge badge-sm shrink-0 ${isPaid ? "badge-success" : "badge-error"}`}>
            {isPaid ? "Paid" : "Outstanding"}
          </span>
        </div>

        <p className="text-xs text-base-content/50 line-clamp-2 leading-relaxed">
          {r.description || <span className="italic">No description</span>}
        </p>

        <div className="flex justify-between text-xs text-base-content/40 border-t border-base-300 pt-3">
          <div>
            <p className="font-semibold text-base-content/30 uppercase tracking-wider text-[10px]">Issued</p>
            <p className="text-base-content/60 font-medium mt-0.5">{formatDate(r.invoiceDate)}</p>
          </div>
          {isPaid && r.paidDate && (
            <div className="text-center">
              <p className="font-semibold text-base-content/30 uppercase tracking-wider text-[10px]">Paid</p>
              <p className="text-success/80 font-medium mt-0.5">{formatDate(r.paidDate)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="font-semibold text-base-content/30 uppercase tracking-wider text-[10px]">Due</p>
            <p className="text-base-content/60 font-medium mt-0.5">{formatDate(r.dueDate)}</p>
          </div>
        </div>

        {r.loadRef && (
          <p className="text-xs text-base-content/30">
            <span className="uppercase tracking-wider text-[10px] font-bold">Ref</span>{" "}{r.loadRef}
          </p>
        )}
      </div>

      <div className={`grid border-t border-base-300 divide-x divide-base-300 ${isPaid ? "grid-cols-3" : "grid-cols-2"}`}>
        {isPaid && (
          <button
            onClick={() => onReopen(r)}
            className="py-3 text-sm font-bold text-warning bg-warning/15 hover:bg-warning/25 transition-colors"
          >
            Unmark Paid
          </button>
        )}
        <button
          onClick={() => onDuplicate(r)}
          className="py-3 text-sm font-bold text-primary bg-primary/15 hover:bg-primary/25 transition-colors"
        >
          Duplicate
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

export default function Search({ onDuplicate }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopening, setReopening] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.search(q);
      setRows(data);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function confirmReopen() {
    if (!reopenTarget) return;
    setReopening(true);
    try {
      await api.reopen(reopenTarget._id);
      setRows((prev) => prev.map((r) => r._id === reopenTarget._id ? { ...r, status: "outstanding", paidDate: null } : r));
      setReopenTarget(null);
    } catch (err) { console.error(err); }
    finally { setReopening(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deleteTarget._id);
      setRows((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch}>
        <div className="flex gap-2">
          <input
            className="input flex-1 bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by invoice #, client, load ref, description…"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Search"}
          </button>
        </div>
      </form>

      {searched && !loading && rows.length === 0 && (
        <div className="bg-base-100 rounded-2xl border border-base-300 p-16 text-center">
          <p className="text-base-content/30 text-sm">No invoices found for &ldquo;{q}&rdquo;</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <InvoiceCard
              key={r._id}
              r={r}
              onReopen={setReopenTarget}
              onDelete={setDeleteTarget}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}

      {reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-base-100 rounded-2xl p-6 w-full max-w-sm border border-base-300 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-base-content">Unmark as Paid?</h3>
            <p className="text-sm text-base-content/50">
              <strong>#{reopenTarget.invoiceNumber}</strong> · {reopenTarget.client?.name} will be moved back to outstanding.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors" onClick={() => setReopenTarget(null)} disabled={reopening}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-warning text-warning-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" onClick={confirmReopen} disabled={reopening}>
                {reopening ? <span className="loading loading-spinner loading-sm" /> : "Confirm"}
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
