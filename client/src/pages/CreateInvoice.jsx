// Live CreateInvoice.jsx with dynamic client + route presets
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import InvoicePreview from "../components/InvoicePreview";

export default function CreateInvoice() {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState(() => localStorage.getItem("lastInvoice") || "1000");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [loadRef, setLoadRef] = useState("");
  const [overridePrice, setOverridePrice] = useState(false);
  const [amountCents, setAmountCents] = useState(null);

  useEffect(() => {
    (async () => {
      const list = await api.listClients();
      console.log("Fetched clients:", list);
      setClients(list);
    })();
  }, []);

  useEffect(() => {
    if (!selectedClient?._id) return;
    (async () => {
      const r = await api.listRoutesByClient(selectedClient._id);
      setRoutes(r);
    })();
  }, [selectedClient]);

  function handleClientSelect(client) {
    setSelectedClient(client);
    setSelectedRoute(null);
    setStep(2);
  }

  function handleRouteSelect(route) {
    setSelectedRoute(route);
    if (route.prices?.length) {
      const sorted = [...route.prices].sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom));
      setAmountCents(sorted[0].amountCents);
    } else {
      setAmountCents(null);
    }
    setStep(3);
  }

  const nextInvoiceNumber = useMemo(() => `${parseInt(invoiceNumber) + 1}`, [invoiceNumber]);
  const amount = overridePrice ? amountCents : amountCents ?? 0;

  async function handleSubmit() {
    const payload = {
      clientId: selectedClient._id,
      routeId: selectedRoute?._id,
      invoiceNumber,
      invoiceDate,
      loadRef,
      description: selectedRoute?.descriptionTemplate || selectedRoute?.name,
      amountCents: amount,
    };
    try {
      const created = await api.createInvoice(payload);
      if (created?._id) {
        alert(`Invoice ${invoiceNumber} created.`);
        localStorage.setItem("lastInvoice", invoiceNumber);
        setInvoiceNumber(nextInvoiceNumber);
        setSelectedClient(null);
        setSelectedRoute(null);
        setStep(1);
      } else {
        alert("Failed to create invoice.");
      }
    } catch (err) {
      console.error(err);
      alert(`Create failed: ${err.message || err}`);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-6">
      <section className="space-y-6">
        {step === 1 && (
          <div>
            <h1 className="text-xl font-semibold mb-2">Pick a Bill-To</h1>
            <div className="grid sm:grid-cols-2 gap-3">
              {clients.map((client) => (
                <button
                  key={client._id}
                  onClick={() => handleClientSelect(client)}
                  className="p-4 border rounded-xl text-left hover:shadow"
                >
                  <div className="font-medium">{client.name}</div>
                  <div className="text-sm text-gray-500 whitespace-pre-line">{client.address}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-xl font-semibold mb-2">Pick a Route</h1>
            <div className="space-y-3">
              {routes.map((route) => (
                <button
                  key={route._id}
                  onClick={() => handleRouteSelect(route)}
                  className="w-full text-left border p-4 rounded-xl hover:shadow"
                >
                  <div className="text-sm font-medium mb-1">{route.descriptionTemplate || route.name}</div>
                  <div className="text-sm text-gray-500">
                    {route.prices?.length
                      ? `Suggested: $${(route.prices[0].amountCents / 100).toFixed(2)}`
                      : "No price listed"}
                  </div>
                </button>
              ))}
              <button className="btn btn-ghost mt-3" onClick={() => setStep(1)}>
                ← Back to Bill-To
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Finalize Invoice</h1>

            <div className="form-control">
              <label className="label">Invoice #</label>
              <input
                className="input input-bordered"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">Invoice Date</label>
              <input
                type="date"
                className="input input-bordered"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">Load / Ref #</label>
              <input
                className="input input-bordered"
                value={loadRef}
                onChange={(e) => setLoadRef(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label justify-between">
                <span>Amount (USD)</span>
                <label className="label cursor-pointer p-0 gap-2">
                  <span className="text-xs text-base-content/60">Manual</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={overridePrice}
                    onChange={(e) => setOverridePrice(e.target.checked)}
                  />
                </label>
              </label>
              <input
                type="number"
                className="input input-bordered"
                placeholder="1200"
                value={overridePrice ? (amountCents / 100 || "") : (amount / 100).toFixed(2)}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = Number.parseFloat(v);
                  setAmountCents(Number.isFinite(num) ? Math.round(num * 100) : null);
                }}
                disabled={!overridePrice}
              />
            </div>

            <button className="btn btn-primary" onClick={handleSubmit}>
              Create Invoice
            </button>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Start Over
            </button>
          </div>
        )}
      </section>

      <aside className="lg:sticky lg:top-4">
        {step === 3 && (
          <InvoicePreview
            company={{ name: "US PRIDE LOGISTICS INC" }}
            client={selectedClient}
            invoice={{
              invoiceNumber,
              invoiceDate,
              description: selectedRoute?.descriptionTemplate || selectedRoute?.name,
              amountCents: amount,
              loadRef,
            }}
          />
        )}
      </aside>
    </div>
  );
}