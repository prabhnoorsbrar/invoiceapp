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
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeForm, setRouteForm] = useState(defaultRouteFormState);
  const [savingRoute, setSavingRoute] = useState(false);
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
      setRoutes(sortRoutesByLabel(r));
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
      alert(err.message || "Failed to create bill-to");
    } finally {
      setSavingClient(false);
    }
  }

  function openRouteModal() {
    if (!selectedClient?._id) {
      alert("Select a bill-to client before adding a route.");
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
      alert("Enter an amount greater than $0.00 for the route.");
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
      alert(err.message || "Failed to create route");
    } finally {
      setSavingRoute(false);
    }
  }

  const allowPrimaryAmountEdit = overridePrice || routeAmountCents === null;
  const allowPrimaryDescriptionEdit =
    overrideDescription || !routeDescription;

  const stepsConfig = [
    {
      id: 1,
      label: "Bill-To",
      description: "Choose the customer you'll invoice",
    },
    {
      id: 2,
      label: "Route",
      description: "Select or add the haul details",
    },
    {
      id: 3,
      label: "Review",
      description: "Finalize amounts & send",
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_45%),_radial-gradient(circle_at_bottom,_rgba(30,64,175,0.22),_transparent_55%)]"
      ></div>
      <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-12 pt-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-sky-300/80">
                Invoice Builder
              </p>
              <h1 className="mt-1 text-3xl font-semibold">Create a new invoice</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Flow through a guided setup to select the bill-to, attach the correct
                route, and polish the invoice details before sharing a polished PDF.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-800/70 px-5 py-3 text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Next invoice #
              </p>
              <p className="text-2xl font-semibold text-sky-300">{nextInvoiceNumber}</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
            {stepsConfig.map((meta) => {
              const isActive = step === meta.id;
              const isComplete = step > meta.id;
              return (
                <div
                  key={meta.id}
                  className={`group flex flex-1 min-w-[200px] items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                    isActive
                      ? "border-sky-400/60 bg-sky-400/10 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                      : isComplete
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                      isActive
                        ? "bg-sky-500 text-slate-950"
                        : isComplete
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {meta.id}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {meta.label}
                      {isComplete && <span className="ml-2 text-xs text-emerald-300">Done</span>}
                    </p>
                    <p className="text-xs text-slate-400">{meta.description}</p>
                  </div>
                </div>
              );
            })}
          </nav>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-6">
          {step === 1 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Pick a Bill-To</h2>
                  <p className="text-sm text-slate-400">
                    Choose an existing client or add a new one to start this invoice.
                  </p>
                </div>
                <button
                  className="btn btn-sm border-sky-400/60 bg-sky-500/20 text-sky-200 hover:border-sky-400 hover:bg-sky-500/40"
                  onClick={() => setShowClientModal(true)}
                >
                  + New Bill-To
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {clients.map((client) => (
                  <button
                    key={client._id}
                    onClick={() => handleClientSelect(client)}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-sky-500/10 hover:shadow-lg hover:shadow-sky-900/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-lg font-medium text-slate-50">{client.name}</div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition group-hover:border-sky-400/60 group-hover:bg-sky-500/20 group-hover:text-sky-100">
                        Select
                      </span>
                    </div>
                    {client.address && (
                      <div className="mt-3 text-sm text-slate-400 whitespace-pre-line">
                        {client.address}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Pick a Route</h2>
                  <p className="text-sm text-slate-400">
                    Suggested pricing auto-fills from your saved presets. You can still override it later.
                  </p>
                </div>
                <button
                  className="btn btn-sm border-sky-400/60 bg-sky-500/20 text-sky-200 hover:border-sky-400 hover:bg-sky-500/40"
                  onClick={openRouteModal}
                >
                  + Add Route
                </button>
              </div>
              <div className="space-y-4">
                {routes.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm text-slate-300">
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
                      className="group w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-sky-400/60 hover:bg-sky-500/10 hover:shadow-lg hover:shadow-sky-900/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-lg font-semibold text-slate-50">
                            {route.descriptionTemplate || route.name}
                          </div>
                          {route.name && route.descriptionTemplate && (
                            <div className="text-xs uppercase tracking-widest text-slate-400">
                              {route.name}
                            </div>
                          )}
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition group-hover:border-sky-400/60 group-hover:bg-sky-500/20 group-hover:text-sky-100">
                          Use route
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                          {latest?.amountCents
                            ? `Suggested ${`$${(latest.amountCents / 100).toFixed(2)}`}`
                            : "No price listed"}
                        </span>
                        {latest?.effectiveFrom && (
                          <span className="text-xs text-slate-400">
                            Updated {new Date(latest.effectiveFrom).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <button
                  className="btn btn-ghost mt-2 text-slate-300 hover:bg-white/10"
                  onClick={() => setStep(1)}
                >
                  ← Back to Bill-To
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">Finalize Invoice</h2>
                  <p className="text-sm text-slate-400">
                    Review the invoice metadata and adjust the descriptions or line items before saving.
                  </p>
                </div>
                <button
                  className="btn btn-sm border-white/20 bg-white/5 text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-100"
                  onClick={() => setStep(2)}
                >
                  ← Back to Route
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="form-control">
                  <span className="text-xs uppercase tracking-widest text-slate-400">Invoice #</span>
                  <input
                    className="input input-bordered border-white/10 bg-slate-900/80 text-slate-100"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="text-xs uppercase tracking-widest text-slate-400">Invoice Date</span>
                  <input
                    type="date"
                    className="input input-bordered border-white/10 bg-slate-900/80 text-slate-100"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="text-xs uppercase tracking-widest text-slate-400">Load / Ref #</span>
                  <input
                    className="input input-bordered border-white/10 bg-slate-900/80 text-slate-100"
                    value={loadRef}
                    onChange={(e) => setLoadRef(e.target.value)}
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-200">Main Description</span>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Manual override</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-xs"
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
                </div>
                <textarea
                  className="mt-4 textarea textarea-bordered border-white/10 bg-slate-900/80 text-slate-100"
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

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-200">Main Amount (USD)</span>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Manual override</span>
                    <input
                      type="checkbox"
                      className="toggle toggle-xs"
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
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  className={`mt-4 input input-bordered border-white/10 bg-slate-900/80 text-slate-100 ${
                    allowPrimaryAmountEdit ? "" : "bg-slate-800/60"
                  }`}
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

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">Additional Line Items</h3>
                    <p className="text-sm text-slate-400">
                      Capture accessorials like detention, fuel, or lumper fees so the total stays accurate.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm border-dashed border-sky-400/60 bg-transparent text-sky-200 hover:border-sky-400 hover:bg-sky-500/10"
                    onClick={handleAddLineItem}
                  >
                    + Add line item
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  {extraItems.length === 0 && (
                    <p className="text-sm text-slate-400">
                      Nothing extra yet. Add a line item if you need to tack on miscellaneous charges.
                    </p>
                  )}

                  {extraItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
                    >
                      <label className="form-control">
                        <span className="text-xs uppercase tracking-widest text-slate-400">
                          Description #{idx + 2}
                        </span>
                        <textarea
                          className="textarea textarea-bordered border-white/10 bg-slate-950/80 text-slate-100"
                          placeholder="DETENTION RATE"
                          rows={2}
                          value={item.description || ""}
                          onChange={(e) =>
                            updateLineItem(item.id, {
                              description: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="form-control">
                        <span className="text-xs uppercase tracking-widest text-slate-400">Amount (USD)</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="input input-bordered border-white/10 bg-slate-950/80 text-slate-100"
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
                      </label>
                      <div className="flex justify-end pt-6">
                        <button
                          type="button"
                          className="btn btn-ghost text-rose-200 hover:bg-rose-500/10"
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

              <div className="flex flex-wrap gap-3">
                <button
                  className="btn border-emerald-400/60 bg-emerald-500/90 text-slate-950 hover:border-emerald-300 hover:bg-emerald-400"
                  onClick={handleSubmit}
                >
                  Create Invoice
                </button>
                <button
                  className="btn btn-ghost text-slate-300 hover:bg-white/10"
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
            <div className="rounded-3xl border border-white/10 bg-white/90 p-4 text-slate-900 shadow-2xl shadow-slate-950/40">
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
            </div>
          )}
        </aside>
      </div>


      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto px-4 py-10">
            <div className="relative w-full rounded-3xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-2xl">
              <button
                className="btn btn-sm btn-ghost absolute top-3 right-3"
                onClick={closeClientModal}
              >
                ✕
              </button>
              <h2 className="text-2xl font-semibold text-slate-900">Add Bill-To</h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture the client details and we&apos;ll walk you straight into the matching route step.
              </p>
              <form className="mt-6 space-y-5" onSubmit={handleClientCreate}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="text-xs uppercase tracking-widest text-slate-500">Client name</span>
                    <input
                      className="input input-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                      value={clientForm.name}
                      onChange={(e) => handleClientFormChange("name", e.target.value)}
                      required
                    />
                  </label>
                  <label className="form-control">
                    <span className="text-xs uppercase tracking-widest text-slate-500">Payment terms (days)</span>
                    <input
                      type="number"
                      min={0}
                      className="input input-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                      value={clientForm.paymentTermsDays}
                      onChange={(e) =>
                        handleClientFormChange("paymentTermsDays", e.target.value)
                      }
                    />
                  </label>
                </div>
                <label className="form-control">
                  <span className="text-xs uppercase tracking-widest text-slate-500">Billing address</span>
                  <textarea
                    className="textarea textarea-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                    rows={3}
                    value={clientForm.address}
                    onChange={(e) => handleClientFormChange("address", e.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="text-xs uppercase tracking-widest text-slate-500">
                    Invoice emails (comma separated)
                  </span>
                  <textarea
                    className="textarea textarea-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                    rows={2}
                    value={clientForm.emailTo}
                    onChange={(e) => handleClientFormChange("emailTo", e.target.value)}
                  />
                </label>
                <p className="text-sm text-slate-500">
                  After saving the bill-to you&apos;ll be prompted to add or pick a route.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeClientModal}
                    disabled={savingClient}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn border-sky-400/60 bg-sky-500/90 text-white hover:border-sky-300 hover:bg-sky-400"
                    disabled={savingClient}
                  >
                    {savingClient ? "Saving…" : "Save Bill-To"}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      )}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div className="max-h-full w-full max-w-xl overflow-y-auto px-4 py-10">
            <div className="relative w-full rounded-3xl border border-white/10 bg-white/95 p-6 text-slate-900 shadow-2xl">
              <button
                className="btn btn-sm btn-ghost absolute top-3 right-3"
                onClick={closeRouteModal}
              >
                ✕
              </button>
              <h2 className="text-2xl font-semibold text-slate-900">Add Route</h2>
              <p className="mt-1 text-sm text-slate-500">
                Give the lane a descriptive name, add the base amount, and optionally refine the description template.
              </p>
              <form className="mt-6 space-y-5" onSubmit={handleRouteCreate}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="form-control">
                    <span className="text-xs uppercase tracking-widest text-slate-500">Route name</span>
                    <input
                      className="input input-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                      placeholder="Chicago ➝ Dallas"
                      value={routeForm.name}
                      onChange={(e) => handleRouteFormChange("name", e.target.value)}
                    />
                  </label>
                  <label className="form-control">
                    <span className="text-xs uppercase tracking-widest text-slate-500">Amount (USD)</span>
                    <input
                      className="input input-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="1200.00"
                      value={routeForm.amount}
                      onChange={(e) => handleRouteFormChange("amount", e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="form-control">
                  <span className="text-xs uppercase tracking-widest text-slate-500">Description</span>
                  <textarea
                    className="textarea textarea-bordered border-slate-200 bg-slate-50 text-slate-900 focus:border-sky-400"
                    rows={3}
                    placeholder="Linehaul from Chicago to Dallas"
                    value={routeForm.description}
                    onChange={(e) => handleRouteFormChange("description", e.target.value)}
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeRouteModal}
                    disabled={savingRoute}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn border-sky-400/60 bg-sky-500/90 text-white hover:border-sky-300 hover:bg-sky-400"
                    disabled={savingRoute}
                  >
                    {savingRoute ? "Saving…" : "Save Route"}
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
