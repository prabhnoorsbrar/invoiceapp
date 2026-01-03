// Enhanced Search.jsx with modern tiles and rich invoice info
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

  async function fetchResults(searchTerm) {
    try {
      const data = await api.search(searchTerm);
      setRows(data);
    } catch (err) {
      console.error(err);
      alert("Search failed");
    }
  }
  async function handleSearch(e) {
    e.preventDefault();
    fetchResults(q);
  }

  async function reopen(id) {
    if (!window.confirm("Unmark as paid?")) return;
    try {
      await api.reopen(id);
      fetchResults(q);
    } catch (err) {
      console.error(err);
      alert("Failed to unmark invoice as paid");
    }
  }


  async function deleteInvoice(id) {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    await api.deleteInvoice(id);
    setRows((prev) => prev.filter((row) => row._id !== id));
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
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

      {rows.length > 0 && (
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
                  {r.status === "paid" && (
                    <button
                      onClick={() => reopen(r._id)}
                      className="btn btn-warning btn-block btn-sm"
                    >
                      Unmark Paid
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
      )}
    </div>
  );
}