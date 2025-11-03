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
  routeName: "",
  routeDescription: "",
  routeAmount: "",
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
export default function CreateInvoice({ company, currentUser }) {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState(
    () => localStorage.getItem("lastInvoice") || "1000"
  );
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
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
  useEffect(() => {
    (async () => {
      const list = await api.listClients();
      //console.log("Fetched clients:", list);
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
  const nextInvoiceNumber = useMemo(
    () => `${parseInt(invoiceNumber, 10) + 1}`,
    [invoiceNumber]
  );

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
      alert("Pick a bill-to client before creating an invoice.");
      return;
    }
    if (!selectedRoute?._id) {
      alert("Pick a route before creating an invoice.");
      return;
    }

    const { active, total, primaryDescription, hasAnyDescription } =
      computedInvoiceDetails;

    if (!hasAnyDescription) {
      alert("Add a description for at least one line item.");
      return;
    }
    if (!total || total <= 0) {
      alert("Enter an amount greater than $0.00.");
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
        alert(`Invoice ${invoiceNumber} created.`);
        localStorage.setItem("lastInvoice", invoiceNumber);
        setInvoiceNumber(nextInvoiceNumber);
        setSelectedClient(null);
        setSelectedRoute(null);
        setRoutes([]);
        setStep(1);
        setLoadRef("");
        resetLineItems();
      } else {
        alert("Failed to create invoice.");
      }
    } catch (err) {
      console.error(err);
      alert(`Create failed: ${err.message || err}`);
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
      alert("Client name is required.");
      return;
    }

    const paymentTermsDays = Number.parseInt(clientForm.paymentTermsDays, 10);
    const emailTo = clientForm.emailTo
      .split(/[,\n;]/)
      .map((part) => part.trim())
      .filter(Boolean);

    const trimmedRouteName = clientForm.routeName.trim();
    const trimmedRouteDescription = clientForm.routeDescription.trim();
    const routeAmountCents = parseAmountToCents(clientForm.routeAmount);
    const wantsRoute = Boolean(
      trimmedRouteName || trimmedRouteDescription || routeAmountCents
    );

    if (wantsRoute && !trimmedRouteName && !trimmedRouteDescription) {
      alert("Provide a route name or description for the new bill-to.");
      return;
    }
    if (wantsRoute && (!routeAmountCents || routeAmountCents <= 0)) {
      alert("Enter a base amount greater than $0.00 for the new route.");
      return;
    }

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

      let createdRoute = null;
      if (wantsRoute) {
        createdRoute = await api.createRoutePreset({
          clientId: newClient._id,
          name: trimmedRouteName || trimmedRouteDescription,
          descriptionTemplate:
            trimmedRouteDescription || trimmedRouteName || "",
          baseAmountCents: routeAmountCents,
        });
      }

      closeClientModal();
      handleClientSelect(newClient);
      if (createdRoute) {
        setRoutes([createdRoute]);
        handleRouteSelect(createdRoute);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create bill-to");
    } finally {
      setSavingClient(false);
    }
  }

  const allowPrimaryAmountEdit = overridePrice || routeAmountCents === null;
  const allowPrimaryDescriptionEdit =
    overrideDescription || !routeDescription;

  return (
    
    <div className="relative">
      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        <section className="space-y-6">
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-semibold">Pick a Bill-To</h1>
                <button
                  className="btn btn-sm btn-outline"
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
                    className="p-4 border rounded-xl text-left hover:shadow"
                  >
                    <div className="font-medium">{client.name}</div>
                    <div className="text-sm text-gray-500 whitespace-pre-line">
                      {client.address}
                    </div>
                  </button>
                ))}
              </div>
            </div>
         
          )}

          {step === 2 && (
            <div>
              <h1 className="text-xl font-semibold mb-2">Pick a Route</h1>
              <div className="space-y-3">
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
                      className="w-full text-left border p-4 rounded-xl hover:shadow"
                    >
                      <div className="text-sm font-medium mb-1">
                        {route.descriptionTemplate || route.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {latest?.amountCents
                          ? `Suggested: $${(latest.amountCents / 100).toFixed(2)}`
                          : "No price listed"}
                      </div>
                    </button>
                  );
                })}
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
                  className="textarea textarea-bordered"
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
                  className="input input-bordered"
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
                    className="btn btn-sm btn-outline"
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
                          className="textarea textarea-bordered"
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
                          className="input input-bordered"
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
                          className="btn btn-ghost btn-sm text-error"
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
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Create Invoice
                </button>
                <button
                  
                  className="btn btn-ghost"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto">
            <div className="relative w-full bg-white rounded-xl shadow-xl p-6">
              <button
                className="btn btn-sm btn-ghost absolute top-3 right-3"
                onClick={closeClientModal}
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4">Add Bill-To</h2>
              <form className="space-y-4" onSubmit={handleClientCreate}>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="form-control">
                    <span className="label-text">Client name</span>
                    <input
                      className="input input-bordered"
                      value={clientForm.name}
                      onChange={(e) => handleClientFormChange("name", e.target.value)}
                      required
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text">Payment terms (days)</span>
                    <input
                      type="number"
                      min={0}
                      className="input input-bordered"
                      value={clientForm.paymentTermsDays}
                      onChange={(e) =>
                        handleClientFormChange("paymentTermsDays", e.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="form-control">
                  <span className="label-text">Billing address</span>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={3}
                    value={clientForm.address}
                    onChange={(e) => handleClientFormChange("address", e.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="label-text">Invoice emails (comma separated)</span>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={2}
                    value={clientForm.emailTo}
                    onChange={(e) => handleClientFormChange("emailTo", e.target.value)}
                  />
                </label>

                <div className="divider">Default Route</div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="form-control">
                    <span className="label-text">Route name</span>
                    <input
                      className="input input-bordered"
                      placeholder="Chicago ➝ Dallas"
                      value={clientForm.routeName}
                      onChange={(e) => handleClientFormChange("routeName", e.target.value)}
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text">Base amount (USD)</span>
                    <input
                      className="input input-bordered"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="1200.00"
                      value={clientForm.routeAmount}
                      onChange={(e) =>
                        handleClientFormChange("routeAmount", e.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="form-control">
                  <span className="label-text">Route description</span>
                  <textarea
                    className="textarea textarea-bordered"
                    rows={3}
                    placeholder="Linehaul from Chicago to Dallas"
                    value={clientForm.routeDescription}
                    onChange={(e) =>
                      handleClientFormChange("routeDescription", e.target.value)
                    }
                  />
                </label>
              
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeClientModal}
                    disabled={savingClient}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingClient}>
                    {savingClient ? "Saving…" : "Save Bill-To"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        
        </div>
      )}
    </div>
  );

}