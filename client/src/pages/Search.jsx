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

export default function Search() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopening, setReopening] = useState(false);

  async function fetchResults(searchTerm) {
    setLoading(true);
    try {
      const data = await api.search(searchTerm);
      setRows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    fetchResults(q);
  }

  async function confirmReopen() {
    if (!reopenTarget) return;
    setReopening(true);
    try {
      await api.reopen(reopenTarget._id);
      setRows((prev) => prev.map((r) => r._id === reopenTarget._id ? { ...r, status: "outstanding", paidDate: null } : r));
      setReopenTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setReopening(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteInvoice(deleteTarget._id);
      setRows((prev) => prev.filter((r) => r._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="form-control">
        <label className="label">Search Invoices</label>
        <div className="flex gap-2">
          <input
            className="input input-bordered w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Invoice #, route, load ref, etc"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Search"}
          </button>
        </div>
      </form>

      {rows.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={r._id} className="card w-full bg-base-100 shadow-sm border">
              <div className="card-body">
                <span className={`badge badge-xs ${r.status === "paid" ? "badge-success" : "badge-error"}`}>
                  {r.status.toUpperCase()}
                </span>
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
                  {r.paidDate && <li><strong>Paid:</strong> {formatDate(r.paidDate)}</li>}
                </ul>
                <div className="mt-4 flex flex-col gap-2">
                  {r.status === "paid" && (
                    <button onClick={() => setReopenTarget(r)} className="btn btn-warning btn-block btn-sm">
                      Unmark Paid
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(r)} className="btn btn-error btn-outline btn-block btn-sm">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unmark Paid Confirm Modal */}
      {reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Unmark as Paid?</h3>
            <p className="text-sm text-gray-600">
              Invoice <strong>#{reopenTarget.invoiceNumber}</strong> will be moved back to outstanding.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-ghost" onClick={() => setReopenTarget(null)} disabled={reopening}>Cancel</button>
              <button className="btn btn-warning" onClick={confirmReopen} disabled={reopening}>
                {reopening ? <span className="loading loading-spinner loading-sm" /> : "Confirm"}
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
