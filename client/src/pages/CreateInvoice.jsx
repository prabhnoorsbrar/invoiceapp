import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function CreateInvoice() {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [loadRef, setLoadRef] = useState("");

  useEffect(() => {
    api.listClients().then(setClients);
  }, []);

  async function submit() {
    const payload = {
      clientId,
      description,
      amountCents: Math.round(parseFloat(amount) * 100),
      invoiceDate,
      loadRef,
    };
    const res = await api.createInvoice(payload);
    alert(`Created invoice ${res.invoiceNumber}`);
  }

  return (
    <div className="space-y-3 max-w-md">
      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="border p-2 rounded w-full"
      >
        <option value="">Select client</option>
        {clients.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Route description"
        className="border p-2 rounded w-full"
      />
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (USD)"
        className="border p-2 rounded w-full"
      />
      <input
        type="date"
        value={invoiceDate}
        onChange={(e) => setInvoiceDate(e.target.value)}
        className="border p-2 rounded w-full"
      />
      <input
        value={loadRef}
        onChange={(e) => setLoadRef(e.target.value)}
        placeholder="Load / Ref #"
        className="border p-2 rounded w-full"
      />
      <button
        onClick={submit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Create Invoice
      </button>
    </div>
  );
}
