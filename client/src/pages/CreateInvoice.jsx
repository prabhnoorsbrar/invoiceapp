// Live CreateInvoice.jsx with dynamic client + route presets
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import InvoicePreview from "../components/InvoicePreview";
const PRIMARY_LINE_ID = "primary";

const defaultClientFormState = {
  name: "",
  address: "",
  emailTo: "",
  paymentTermsDays: 30,
  };

const defaultRouteFormState = {
  name: "",
  description: "",
  amount: "",
};

function parseAmountToCents(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (!normalized) return null;
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? Math.round(num * 100) : null;
}

function centsToInputValue(cents) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}
function sortRoutesByLabel(list = []) {
  return [...list].sort((a, b) => {
    const aLabel = (a?.descriptionTemplate || a?.name || "").toLowerCase();
    const bLabel = (b?.descriptionTemplate || b?.name || "").toLowerCase();
    return aLabel.localeCompare(bLabel);
  });
}

function createLineItem(overrides = {}) {
  const base = {
    id: overrides.id || `li-${Math.random().toString(36).slice(2, 10)}`,
    description: "",
    amountCents: null,
    amountInput: "",
  };

  const merged = { ...base, ...overrides };

  if (
    typeof overrides.amountInput === "undefined" &&
    typeof merged.amountCents === "number" &&
    Number.isFinite(merged.amountCents)
  ) {
    merged.amountInput = centsToInputValue(merged.amountCents);
  }

  return merged;
}
export default function CreateInvoice({ company, currentUser, prefill, onPrefillConsumed }) {
  const [toast, setToast] = useState(null);
  const toastTimer = React.useRef(null);

  function showToast(message, type = "info") {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState("…");
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [loadRef, setLoadRef] = useState("");
  const [overridePrice, setOverridePrice] = useState(false);
  const [overrideDescription, setOverrideDescription] = useState(false);

  const [routeAmountCents, setRouteAmountCents] = useState(null);
  const [routeDescription, setRouteDescription] = useState("");

  const [lineItems, setLineItems] = useState(() => [
    createLineItem({ id: PRIMARY_LINE_ID, amountCents: null }),
  ]);

  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState(defaultClientFormState);
  const [savingClient, setSavingClient] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm] = useState(defaultRouteFormState);
  const [savingRoute, setSavingRoute] = useState(false);
  const prefillRef = React.useRef(prefill);

  useEffect(() => {
    (async () => {
      const [list, lastData] = await Promise.all([
        api.listClients(),
        api.lastInvoiceNumber().catch(() => ({ invoiceNumber: null })),
      ]);
      setClients(list);
      const last = lastData?.invoiceNumber;
      const lastNum = last ? parseInt(last, 10) : null;
      setInvoiceNumber(Number.isFinite(lastNum) ? String(lastNum + 1) : last ? last : "1001");
      // If duplicating, auto-select the client (triggers routes useEffect)
      const pf = prefillRef.current;
      if (pf) {
        const clientId = pf.clientId || pf.client?._id;
        const client = list.find((c) => c._id === clientId);
        if (client) setSelectedClient(client);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClient?._id) return;
    (async () => {
      const r = await api.listRoutesByClient(selectedClient._id);
      const sorted = sortRoutesByLabel(r);
      setRoutes(sorted);
      // Apply prefill once routes are loaded
      const pf = prefillRef.current;
      if (pf && (pf.clientId || pf.client?._id) === selectedClient._id) {
        const route = sorted.find((rt) => rt._id === pf.routeId);
        if (route) setSelectedRoute(route);
        const items = Array.isArray(pf.lineItems) && pf.lineItems.length
          ? pf.lineItems.map((item, i) => createLineItem({
              id: i === 0 ? PRIMARY_LINE_ID : undefined,
              description: item.description || "",
              amountCents: item.amountCents ?? null,
            }))
          : [createLineItem({ id: PRIMARY_LINE_ID, description: pf.description || "", amountCents: pf.amountCents ?? null })];
        setLineItems(items);
        setLoadRef(pf.loadRef || "");
        setOverridePrice(true);
        setOverrideDescription(true);
        setStep(3);
        prefillRef.current = null;
        onPrefillConsumed?.();
      }
    })();
  }, [selectedClient]);
  const computedInvoiceDetails = useMemo(() => {
    const normalized = lineItems.map((item, index) => ({
      id: item.id,
      description: item.description?.trim() || "",
      amountCents:
        typeof item.amountCents === "number" && Number.isFinite(item.amountCents)
          ? item.amountCents
          : null,
      isPrimary: index === 0,
    }));

    const active = normalized.filter((item) => {
      if (item.description) return true;
      return typeof item.amountCents === "number" && item.amountCents > 0;
    });

    const total = active.reduce(
      (sum, item) => sum + (typeof item.amountCents === "number" ? item.amountCents : 0),
      0
    );

    const primaryDescription = normalized[0]?.description || "";

    const hasAnyDescription = active.some((item) => Boolean(item.description));

    return {
      normalized,
      active,
      total,
      primaryDescription,
      hasAnyDescription,
    };
  }, [lineItems]);

  const primaryItem = lineItems[0] || createLineItem({ id: PRIMARY_LINE_ID });
  const extraItems = lineItems.slice(1);

  function resetLineItems() {
    setLineItems([createLineItem({ id: PRIMARY_LINE_ID, amountCents: null })]);
    setRouteAmountCents(null);
    setRouteDescription("");
    setOverridePrice(false);
    setOverrideDescription(false);
  }
  function handleClientSelect(client) {
    setSelectedClient(client);
    setSelectedRoute(null);
    setRoutes([]);
    resetLineItems();
    setShowRouteModal(false);
    setRouteForm(defaultRouteFormState);
    setStep(2);
  }

  function handleRouteSelect(route) {
    setSelectedRoute(route);
    const sorted = Array.isArray(route.prices)
      ? [...route.prices].sort(
          (a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom)
        )
      : [];
    const latestAmount = sorted[0]?.amountCents ?? null;
    const baseDescription = route.descriptionTemplate || route.name || "";

    setRouteAmountCents(
      typeof latestAmount === "number" && Number.isFinite(latestAmount)
        ? latestAmount
        : null
    );
    setRouteDescription(baseDescription);
    setOverridePrice(!latestAmount);
    setOverrideDescription(!baseDescription);
    setLineItems([
      createLineItem({
        id: PRIMARY_LINE_ID,
        description: baseDescription,
        amountCents:
          typeof latestAmount === "number" && Number.isFinite(latestAmount)
            ? latestAmount
            : null,
        amountInput:
          typeof latestAmount === "number" && Number.isFinite(latestAmount)
            ? centsToInputValue(latestAmount)
            : "",
      }),
    ]);
    setStep(3);
  }

  function handleAddLineItem() {
    setLineItems((items) => [...items, createLineItem()]);
  }

  function updateLineItem(id, patch) {
    setLineItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }
  async function handleSubmit() {
    if (!selectedClient?._id) {
      showToast("Pick a bill-to client before creating an invoice.", "error");
      return;
    }
    if (!selectedRoute?._id) {
      showToast("Pick a route before creating an invoice.", "error");
      return;
    }

    const { active, total, primaryDescription, hasAnyDescription } =
      computedInvoiceDetails;

    if (!hasAnyDescription) {
      showToast("Add a description for at least one line item.", "error");
      return;
    }
    if (!total || total <= 0) {
      showToast("Enter an amount greater than $0.00.", "error");
      return;
    }
    const payload = {
      clientId: selectedClient._id,
      routeId: selectedRoute?._id,
      invoiceNumber,
      invoiceDate,
      loadRef,
      description: primaryDescription,
      amountCents: total,
      lineItems: active,
    };
    try {
      const created = await api.createInvoice(payload);
      if (created?._id) {
        showToast(`Invoice ${invoiceNumber} created successfully.`, "success");
        const n = parseInt(invoiceNumber, 10);
        setInvoiceNumber(Number.isFinite(n) ? String(n + 1) : invoiceNumber);
        setSelectedClient(null);
        setSelectedRoute(null);
        setRoutes([]);
        setStep(1);
        setLoadRef("");
        resetLineItems();
      } else {
        showToast("Failed to create invoice.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Create failed.", "error");
    }
  }
  function handlePrimaryAmountChange(value) {
    const cents = parseAmountToCents(value);
    updateLineItem(PRIMARY_LINE_ID, {
      amountInput: value,
      amountCents:
        typeof cents === "number" && Number.isFinite(cents) ? cents : null,
    });
  }

  function handleExtraAmountChange(id, value) {
    const cents = parseAmountToCents(value);
    updateLineItem(id, {
      amountInput: value,
      amountCents:
        typeof cents === "number" && Number.isFinite(cents) ? cents : null,
    });
  }

  function handleClientFormChange(field, value) {
    setClientForm((prev) => ({ ...prev, [field]: value }));
  }

  function closeClientModal() {
    setShowClientModal(false);
    setClientForm(defaultClientFormState);
  }

  async function handleClientCreate(event) {
    event.preventDefault();
    if (savingClient) return;

    const name = clientForm.name.trim();
    if (!name) {
      showToast("Client name is required.", "error");
      return;
    }

    const paymentTermsDays = Number.parseInt(clientForm.paymentTermsDays, 10);
    const emailTo = clientForm.emailTo
      .split(/[,\n;]/)
      .map((part) => part.trim())
      .filter(Boolean);

    

    setSavingClient(true);
    try {
      const newClient = await api.createClient({
        name,
        address: clientForm.address.trim(),
        paymentTermsDays: Number.isFinite(paymentTermsDays)
          ? paymentTermsDays
          : 30,
        emailTo,
      });

      setClients((prev) =>
        [...prev, newClient].sort((a, b) => a.name.localeCompare(b.name))
      );

     

      closeClientModal();
      handleClientSelect(newClient);
      
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create bill-to.", "error");
    } finally {
      setSavingClient(false);
    }
  }
  function openRouteModal() {
    if (!selectedClient?._id) {
      showToast("Select a bill-to client before adding a route.", "error");
      return;
    }
    setRouteForm(defaultRouteFormState);
    setShowRouteModal(true);
  }

  function closeRouteModal() {
    setShowRouteModal(false);
    setRouteForm(defaultRouteFormState);
  }

  function handleRouteFormChange(field, value) {
    setRouteForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRouteCreate(event) {
    event.preventDefault();
    if (savingRoute || !selectedClient?._id) return;

    const name = routeForm.name.trim();
    const description = routeForm.description.trim();
    const amountCents = parseAmountToCents(routeForm.amount);

    if (!name && !description) {
      alert("Provide a name or description for the route.");
      return;
    }

    if (!amountCents || amountCents <= 0) {
      showToast("Enter an amount greater than $0.00 for the route.", "error");
      return;
    }

    setSavingRoute(true);
    try {
      const createdRoute = await api.createRoutePreset({
        clientId: selectedClient._id,
        name: name || description,
        descriptionTemplate: description || name || "",
        baseAmountCents: amountCents,
      });

      setRoutes((prev) => sortRoutesByLabel([...prev, createdRoute]));

      closeRouteModal();
      handleRouteSelect(createdRoute);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create route.", "error");
    } finally {
      setSavingRoute(false);
    }
  }

  const allowPrimaryAmountEdit = overridePrice || routeAmountCents === null;
  const allowPrimaryDescriptionEdit =
    overrideDescription || !routeDescription;

  return (
    <div className="relative">
      {toast && (
        <div className="toast toast-top toast-center z-50">
          <div className={`alert ${toast.type === "success" ? "alert-success" : toast.type === "error" ? "alert-error" : "alert-info"} shadow-lg`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    <div className="relative">
      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        <section className="space-y-6">
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-semibold">Pick a Bill-To</h1>
                <button
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => setShowClientModal(true)}
                >
                  + Add
                </button>

              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {clients.map((client) => (
                  <button
                    key={client._id}
                    onClick={() => handleClientSelect(client)}
                    className="p-4 bg-base-100 border border-base-300 rounded-xl text-left hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <div className="font-semibold text-base-content">{client.name}</div>
                    <div className="text-sm text-base-content/50 whitespace-pre-line mt-1">
                      {client.address}
                    </div>
                  </button>
                ))}
              </div>
            </div>
         
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-semibold">Pick a Route</h1>
                <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity" onClick={openRouteModal}>
                  + Add Route
                </button>
              </div>
              <div className="space-y-3">
                {routes.length === 0 && (
                  <div className="rounded-xl border border-dashed border-base-300 p-6 text-center text-sm text-base-content/40">
                    {selectedClient
                      ? `No routes found for ${selectedClient.name}. Add a new route to continue.`
                      : "Select a bill-to to manage routes."}
                  </div>
                )}
                {routes.map((route) => {
                  const latest = Array.isArray(route.prices)
                    ? [...route.prices].sort(
                        (a, b) =>
                          new Date(b.effectiveFrom) - new Date(a.effectiveFrom)
                      )[0]
                    : null;
                  return (
                    <button
                      key={route._id}
                      onClick={() => handleRouteSelect(route)}
                      className="w-full text-left bg-base-100 border border-base-300 p-4 rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
                    >
                      <div className="text-sm font-semibold text-base-content mb-1">
                        {route.descriptionTemplate || route.name}
                      </div>
                      <div className="text-sm text-base-content/50">
                        {latest?.amountCents
                          ? `Suggested: $${(latest.amountCents / 100).toFixed(2)}`
                          : "No price listed"}
                      </div>
                    </button>
                  );
                })}
                <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity mt-3" onClick={() => setStep(1)}>
                  ← Back to Bill-To
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold">Finalize Invoice</h1>

              <div className="form-control">
                <label className="label"><span className="label-text">Invoice #</span></label>
                <input
                  className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Invoice Date</span></label>
                <input
                  type="date"
                  className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text">Load / Ref #</span></label>
                <input
                  className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                  value={loadRef}
                  onChange={(e) => setLoadRef(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label justify-between">
                  <span>Main Description</span>
                  <label className="label cursor-pointer p-0 gap-2">
                    <span className="text-xs text-base-content/60">Manual</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm"
                      checked={overrideDescription}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOverrideDescription(checked);
                        if (!checked) {
                          updateLineItem(PRIMARY_LINE_ID, {
                            description: routeDescription || "",
                          });
                        }
                      }}
                    />
                  </label>
                </label>
                <textarea
                  className="textarea w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                  placeholder="Describe the load…"
                  value={primaryItem.description || ""}
                  onChange={(e) =>
                    updateLineItem(PRIMARY_LINE_ID, {
                      description: e.target.value,
                    })
                  }
                  disabled={!allowPrimaryDescriptionEdit}
                  rows={3}
                />
              </div>

              <div className="form-control">
                <label className="label justify-between">
                  <span>Main Amount (USD)</span>
                  <label className="label cursor-pointer p-0 gap-2">
                    <span className="text-xs text-base-content/60">Manual</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-sm"
                      checked={overridePrice}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setOverridePrice(checked);
                        if (!checked) {
                          updateLineItem(PRIMARY_LINE_ID, {
                            amountCents: routeAmountCents,
                            amountInput:
                              typeof routeAmountCents === "number" &&
                              Number.isFinite(routeAmountCents)
                                ? centsToInputValue(routeAmountCents)
                                : "",
                          });
                        }
                      }}
                    />
                  </label>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                  placeholder="1200.00"
                  value={
                    typeof primaryItem.amountInput === "string"
                      ? primaryItem.amountInput
                      : centsToInputValue(primaryItem.amountCents)
                  }
                  onChange={(e) => handlePrimaryAmountChange(e.target.value)}
                  disabled={!allowPrimaryAmountEdit}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">Additional Line Items</h2>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity"
                    onClick={handleAddLineItem}
                  >
                    + Add line item
                  </button>
                </div>

                {extraItems.length === 0 && (
                  <p className="text-sm text-base-content/60">
                    Need detention or fuel adjustments? Add them here and
                    we&apos;ll include them in the total.
                  </p>
                )}

                <div className="space-y-3 mt-3">
                  {extraItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid sm:grid-cols-[minmax(0,1fr)_150px_auto] gap-3 items-start"
                    >
                      <div className="form-control">
                        <label className="label">
                          <span className="text-xs text-base-content/60">
                            Description #{idx + 2}
                          </span>
                        </label>
                        <textarea
                          className="textarea w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                          placeholder="DETENTION RATE"
                          rows={2}
                          value={item.description || ""}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="text-xs text-base-content/60">
                            Amount (USD)
                          </span>
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                          placeholder="50.00"
                          value={
                            typeof item.amountInput === "string"
                              ? item.amountInput
                              : centsToInputValue(item.amountCents)
                          }
                          onChange={(e) =>
                            handleExtraAmountChange(item.id, e.target.value)
                          }
                        />
                      </div>
                      <div className="flex sm:justify-end pt-6">
                        <button
                          type="button"
                          className="px-3 py-1 rounded-lg border-2 border-error/50 text-error text-sm font-semibold hover:bg-error/10 transition-colors"
                          onClick={() =>
                            setLineItems((items) =>
                              items.filter((entry) => entry.id !== item.id)
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity" onClick={handleSubmit}>
                  Create Invoice
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setStep(1);
                    setSelectedClient(null);
                    setSelectedRoute(null);
                    setRoutes([]);
                    setLoadRef("");
                    resetLineItems();
                  }}
                >
                  Start Over
                </button>
              
              </div>
            </div>
          )}
        </section>

            
        <aside className="lg:sticky lg:top-4">
          {step === 3 && (
            <InvoicePreview
              company={company}
              user={currentUser}
              client={selectedClient}
              invoice={{
                invoiceNumber,
                invoiceDate,
                loadRef,
                description: computedInvoiceDetails.primaryDescription,
                amountCents: computedInvoiceDetails.total,
                lineItems: computedInvoiceDetails.normalized,
              }}
            />
          )}
        </aside>
      </div>

            
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-full w-full max-w-lg overflow-y-auto">
            <div className="bg-base-100 border border-base-300 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-base-300">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-1">Billing Details</p>
                  <h2 className="text-xl font-bold text-base-content">Add Bill-To</h2>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={closeClientModal}>✕</button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleClientCreate}>
                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-semibold">Client name</span></label>
                  <input
                    className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                    value={clientForm.name}
                    onChange={(e) => handleClientFormChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-semibold">Payment terms</span></label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      className="input w-28 bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                      value={clientForm.paymentTermsDays}
                      onChange={(e) => handleClientFormChange("paymentTermsDays", e.target.value)}
                    />
                    <span className="text-sm text-base-content/50">days</span>
                  </div>
                </div>
                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-semibold">Billing address</span></label>
                  <textarea
                    className="textarea w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                    rows={3}
                    value={clientForm.address}
                    onChange={(e) => handleClientFormChange("address", e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label className="label pb-1">
                    <span className="label-text font-semibold">Invoice emails</span>
                    <span className="label-text-alt text-base-content/40">Comma separated</span>
                  </label>
                  <textarea
                    className="textarea w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                    rows={2}
                    value={clientForm.emailTo}
                    onChange={(e) => handleClientFormChange("emailTo", e.target.value)}
                  />
                </div>
                <p className="text-xs text-base-content/40">After saving you'll be prompted to add or pick a route.</p>
                <div className="flex gap-3 justify-end pt-2 border-t border-base-300">
                  <button type="button" className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors" onClick={closeClientModal} disabled={savingClient}>Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" disabled={savingClient}>
                    {savingClient ? <span className="loading loading-spinner loading-sm" /> : "Save Bill-To"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-full w-full max-w-lg overflow-y-auto">
            <div className="bg-base-100 border border-base-300 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-base-300">
                <h2 className="text-xl font-bold text-base-content">Add Route</h2>
                <button className="btn btn-sm btn-ghost" onClick={closeRouteModal}>✕</button>
              </div>
              <form className="p-6 space-y-4" onSubmit={handleRouteCreate}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-semibold">Route name</span></label>
                    <input
                      className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                      placeholder="Chicago → Dallas"
                      value={routeForm.name}
                      onChange={(e) => handleRouteFormChange("name", e.target.value)}
                    />
                  </div>
                  <div className="form-control">
                    <label className="label pb-1"><span className="label-text font-semibold">Amount (USD)</span></label>
                    <input
                      className="input w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="1200.00"
                      value={routeForm.amount}
                      onChange={(e) => handleRouteFormChange("amount", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-control">
                  <label className="label pb-1"><span className="label-text font-semibold">Description</span></label>
                  <textarea
                    className="textarea w-full bg-base-200 border border-base-content/20 focus:border-primary focus:outline-none"
                    rows={3}
                    placeholder="Linehaul from Chicago to Dallas"
                    value={routeForm.description}
                    onChange={(e) => handleRouteFormChange("description", e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-base-300">
                  <button type="button" className="px-4 py-2 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors" onClick={closeRouteModal} disabled={savingRoute}>Cancel</button>
                  <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50" disabled={savingRoute}>
                    {savingRoute ? <span className="loading loading-spinner loading-sm" /> : "Save Route"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        
        </div>
      )}
    </div>
    </div>
  );

}