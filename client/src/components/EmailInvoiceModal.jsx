import React, { useState, useRef } from "react";
import { api } from "../api";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

const SIGNATURE = `Kawaljit Brar
CEO | US PRIDE LOGISTICS INC
📞 209-992-1517
MC# 1079076 | DOT# 3367042`;

const DOC_LABELS = [
  "Signed Rate Con",
  "Bill of Lading (BOL)",
  "Proof of Delivery (POD)",
  "Fuel Surcharge / Receipt",
  "Detention Proof",
  "Other",
];

function formatSubjectDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return `${m}-${d}-${String(y).slice(2)}`;
}

function buildSubject(invoice) {
  const date = formatSubjectDate(invoice.invoiceDate);
  const desc = invoice.description || "";
  const ref = invoice.loadRef?.trim();
  if (ref) {
    return `Invoice & supporting documents for ${ref} ${date}`;
  }
  return `Invoice for US PRIDE LOGISTICS INC: ${desc} ${date}`;
}

function buildBody(docNames, loadRef) {
  const parts = ["invoice", ...docNames.map((d) => {
    if (d === "Signed Rate Con") return "signed rate con";
    if (d === "Bill of Lading (BOL)") return "bill of lading";
    if (d === "Proof of Delivery (POD)") return "POD";
    if (d === "Fuel Surcharge / Receipt") return "fuel surcharge receipt";
    if (d === "Detention Proof") return "detention proof";
    return d.toLowerCase();
  })];

  let docList = "";
  if (parts.length === 1) docList = parts[0];
  else if (parts.length === 2) docList = parts.join(" and ");
  else docList = parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];

  const refPart = loadRef?.trim() ? ` for ${loadRef.trim()}` : "";
  return `Please see the attached ${docList}${refPart} below.\n\n${SIGNATURE}`;
}

export default function EmailInvoiceModal({ invoice, client, company, currentUser, onClose }) {
  const [to, setTo] = useState((client?.emailTo || []).join(", "));
  const [cc, setCc] = useState((client?.cc || []).join(", "));
  const [subject, setSubject] = useState(() => buildSubject(invoice));
  const [body, setBody] = useState(() => buildBody([], invoice.loadRef));

  // Uploaded extra files: [{ file: File, label: string }]
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Recompute body whenever uploads change
  function updateBody(newUploads) {
    const docNames = newUploads.map((u) => u.label);
    setBody(buildBody(docNames, invoice.loadRef));
  }

  function handleFileAdd(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next = [
      ...uploads,
      ...files.map((f) => ({ file: f, label: guessLabel(f.name) })),
    ];
    setUploads(next);
    updateBody(next);
    e.target.value = "";
  }

  function guessLabel(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes("ratecon") || lower.includes("rate_con") || lower.includes("rc") || lower.includes("carrier")) return "Signed Rate Con";
    if (lower.includes("bol") || lower.includes("lading")) return "Bill of Lading (BOL)";
    if (lower.includes("pod") || lower.includes("delivery")) return "Proof of Delivery (POD)";
    if (lower.includes("fuel") || lower.includes("surcharge") || lower.includes("receipt")) return "Fuel Surcharge / Receipt";
    if (lower.includes("detention")) return "Detention Proof";
    return "Signed Rate Con";
  }

  function changeLabel(idx, label) {
    const next = uploads.map((u, i) => i === idx ? { ...u, label } : u);
    setUploads(next);
    updateBody(next);
  }

  function removeUpload(idx) {
    const next = uploads.filter((_, i) => i !== idx);
    setUploads(next);
    updateBody(next);
  }

  async function handleSend(e) {
    e.preventDefault();
    setError("");
    const toList = to.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (!toList.length) { setError("Add at least one recipient"); return; }

    setSending(true);
    try {
      // Generate invoice PDF as base64
      const pdfBase64 = generateInvoicePdf({
        invoice,
        client,
        company,
        user: currentUser,
        options: { returnBase64: true },
      });

      const formData = new FormData();
      toList.forEach((addr) => formData.append("to", addr));
      const ccList = cc.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      ccList.forEach((addr) => formData.append("cc", addr));
      formData.append("subject", subject);
      formData.append("body", body);
      if (pdfBase64) formData.append("invoicePdf", pdfBase64);
      uploads.forEach((u) => formData.append("attachments", u.file, u.file.name));

      await api.emailInvoice(invoice._id, formData);
      setSent(true);
    } catch (err) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-base-100/80 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto text-2xl">✓</div>
          <div>
            <p className="text-lg font-bold text-success">Email Sent</p>
            <p className="text-sm text-base-content/50 mt-1">Invoice #{invoice.invoiceNumber} delivered successfully.</p>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-primary-content text-sm font-bold hover:opacity-90 transition-opacity">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100/80 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold">Email Invoice</h2>
            <p className="text-xs text-base-content/40 mt-0.5">#{invoice.invoiceNumber} · {client?.name}</p>
          </div>
          <button onClick={onClose} className="text-base-content/40 hover:text-base-content transition-colors text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">

            {/* To / CC */}
            <div className="grid grid-cols-1 gap-3">
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-semibold">To</span>
                  <span className="label-text-alt text-base-content/30">Comma separated</span>
                </label>
                <input
                  className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="billing@client.com"
                  required
                />
              </div>
              <div className="form-control">
                <label className="label pb-1">
                  <span className="label-text font-semibold">CC</span>
                  <span className="label-text-alt text-base-content/30">Optional</span>
                </label>
                <input
                  className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="manager@client.com"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="form-control">
              <label className="label pb-1"><span className="label-text font-semibold">Subject</span></label>
              <input
                className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="label-text font-semibold text-sm">Attachments</span>
              </div>

              {/* Invoice PDF — always attached */}
              <div className="flex items-center gap-3 bg-primary/[0.07] border border-primary/20 rounded-xl px-4 py-2.5">
                <span className="text-primary text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-base-content truncate">Invoice {invoice.invoiceNumber}.pdf</p>
                  <p className="text-xs text-base-content/40">Auto-generated · always included</p>
                </div>
                <span className="text-xs text-primary/60 font-bold uppercase tracking-wider shrink-0">Invoice</span>
              </div>

              {/* Uploaded files */}
              {uploads.map((u, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5">
                  <span className="text-base-content/40 text-lg shrink-0">📎</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium text-base-content truncate">{u.file.name}</p>
                    <select
                      className="select select-xs bg-white/[0.06] border border-white/10 text-xs text-base-content/70 w-full focus:outline-none"
                      value={u.label}
                      onChange={(e) => changeLabel(idx, e.target.value)}
                    >
                      {DOC_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => removeUpload(idx)} className="shrink-0 text-base-content/30 hover:text-error transition-colors text-lg leading-none">✕</button>
                </div>
              ))}

              {/* Add file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm text-base-content/40 hover:border-primary/40 hover:text-primary/60 hover:bg-primary/[0.04] transition-all"
              >
                + Add Document (BOL, Rate Con, POD…)
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileAdd} />
            </div>

            {/* Body */}
            <div className="form-control">
              <label className="label pb-1">
                <span className="label-text font-semibold">Message</span>
                <span className="label-text-alt text-base-content/30">Auto-generated · editable</span>
              </label>
              <textarea
                className="textarea w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4 py-3 text-sm leading-relaxed"
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            {error && <p className="text-error text-sm font-medium">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-3 border-t border-white/10 flex gap-3 justify-end shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm font-semibold hover:bg-white/[0.06] transition-colors" disabled={sending}>Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-lg bg-primary text-primary-content text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2" disabled={sending}>
              {sending ? <><span className="loading loading-spinner loading-sm" /> Sending…</> : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
