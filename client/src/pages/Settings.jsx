import React, { useEffect, useState } from "react";
import { api, setCurrentUser } from "../api";

function parseEmails(str) {
  return str.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean);
}
function joinEmails(arr) {
  return (arr || []).join(", ");
}

function ClientFormModal({ client, onSave, onDelete, onClose }) {
  const isNew = !client._id;
  const [form, setForm] = useState({
    name: client.name || "",
    address: client.address || "",
    emailTo: joinEmails(client.emailTo),
    cc: joinEmails(client.cc),
    paymentTermsDays: client.paymentTermsDays ?? 30,
    showDueDate: client.showDueDate ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        emailTo: parseEmails(form.emailTo),
        cc: parseEmails(form.cc),
        paymentTermsDays: parseInt(form.paymentTermsDays, 10) || 30,
        showDueDate: form.showDueDate,
      };
      const result = isNew
        ? await api.createClient(payload)
        : await api.updateClient(client._id, payload);
      onSave(result, isNew);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100/80 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
          <h2 className="text-lg font-bold">{isNew ? "Add Client" : "Edit Client"}</h2>
          <button onClick={onClose} className="text-base-content/40 hover:text-base-content transition-colors text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Name</span></label>
            <input className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Billing Address</span></label>
            <textarea className="textarea w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4 py-3" rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text font-semibold">Invoice To (emailTo)</span>
              <span className="label-text-alt text-base-content/40">Comma separated</span>
            </label>
            <textarea className="textarea w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4 py-3" rows={2} placeholder="billing@client.com, ap@client.com" value={form.emailTo} onChange={(e) => setForm((f) => ({ ...f, emailTo: e.target.value }))} />
          </div>
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text font-semibold">CC</span>
              <span className="label-text-alt text-base-content/40">Comma separated</span>
            </label>
            <textarea className="textarea w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4 py-3" rows={2} placeholder="manager@client.com" value={form.cc} onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))} />
          </div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Net Terms (days)</span></label>
            <input type="number" min={0} max={365} className="input w-28 bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none" value={form.paymentTermsDays} onChange={(e) => setForm((f) => ({ ...f, paymentTermsDays: e.target.value }))} />
          </div>
          <label className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 cursor-pointer hover:bg-white/[0.05] transition-colors">
            <div>
              <p className="text-sm font-semibold">Show due date on PDF</p>
              <p className="text-xs text-base-content/40 mt-0.5">When off, due date and net terms are hidden from the client PDF</p>
            </div>
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.showDueDate ? "bg-primary" : "bg-white/10"}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.showDueDate ? "translate-x-5" : "translate-x-0"}`} />
              <input type="checkbox" className="sr-only" checked={form.showDueDate} onChange={(e) => setForm((f) => ({ ...f, showDueDate: e.target.checked }))} />
            </div>
          </label>
          {error && <p className="text-error text-sm">{error}</p>}

          {!isNew && confirmDelete ? (
            <div className="bg-error/10 border border-error/30 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-error">Delete <span className="font-bold">{client.name}</span>? This cannot be undone.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg border border-white/10 text-sm font-semibold hover:bg-white/[0.06] transition-colors" disabled={deleting}>Cancel</button>
                <button
                  type="button"
                  className="flex-1 py-2 rounded-lg bg-error text-error-content text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  disabled={deleting}
                  onClick={async () => { setDeleting(true); try { await api.deleteClient(client._id); onDelete(client._id); } catch (e) { setError(e.message); setConfirmDelete(false); } finally { setDeleting(false); } }}
                >
                  {deleting ? <span className="loading loading-spinner loading-sm" /> : "Yes, Delete"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 pt-2 border-t border-white/10">
              {!isNew && (
                <button type="button" onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg bg-red-600 border border-red-500 text-white text-sm font-bold hover:bg-red-500 active:bg-red-700 shadow-[0_0_12px_rgba(239,68,68,0.4)] hover:shadow-[0_0_18px_rgba(239,68,68,0.6)] transition-all">
                  Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm font-semibold hover:bg-white/[0.06] transition-colors" disabled={saving}>Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity" disabled={saving}>
                  {saving ? <span className="loading loading-spinner loading-sm" /> : isNew ? "Add Client" : "Save"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function Settings({ currentUser, onUserUpdate, company, onCompanyUpdate }) {
  const [tab, setTab] = useState("clients");
  const [clients, setClients] = useState([]);
  const [clientStats, setClientStats] = useState({});
  const [loadingClients, setLoadingClients] = useState(true);
  const [editTarget, setEditTarget] = useState(null);

  // Account form
  const [email, setEmail] = useState(currentUser?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);

  // Company form
  const [companyForm, setCompanyForm] = useState({
    name: company?.name || "",
    address: company?.address || "",
    phone: company?.phone || "",
  });
  const [companyMsg, setCompanyMsg] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    Promise.all([api.listClients(), api.clientStats()])
      .then(([data, stats]) => { setClients(data); setClientStats(stats); })
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }, []);

  // Sync company form if prop changes
  useEffect(() => {
    setCompanyForm({ name: company?.name || "", address: company?.address || "", phone: company?.phone || "" });
  }, [company]);

  async function handleAccountSave(e) {
    e.preventDefault();
    setAccountMsg(null);
    if (newPassword && newPassword !== confirmPassword) {
      setAccountMsg({ type: "error", text: "New passwords don't match" });
      return;
    }
    setSavingAccount(true);
    try {
      const payload = {};
      if (email !== currentUser?.email) payload.email = email;
      if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
      if (!Object.keys(payload).length) { setAccountMsg({ type: "info", text: "Nothing to update" }); return; }
      const res = await api.updateMe(payload);
      setCurrentUser(res.user);
      onUserUpdate?.(res.user);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setAccountMsg({ type: "success", text: "Account updated" });
    } catch (err) {
      setAccountMsg({ type: "error", text: err.message || "Update failed" });
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleCompanySave(e) {
    e.preventDefault();
    setCompanyMsg(null);
    setSavingCompany(true);
    try {
      const res = await api.updateCompany({
        name: companyForm.name.trim(),
        address: companyForm.address.trim(),
        phone: companyForm.phone.trim(),
      });
      onCompanyUpdate?.(res.company);
      setCompanyMsg({ type: "success", text: "Company updated" });
    } catch (err) {
      setCompanyMsg({ type: "error", text: err.message || "Update failed" });
    } finally {
      setSavingCompany(false);
    }
  }

  const tabs = ["clients", "company", "account"];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Tabs */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 flex gap-1 w-fit">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 capitalize ${tab === t ? "bg-primary text-primary-content shadow-sm" : "text-base-content/50 hover:text-base-content"}`}>
            {t === "clients" ? "Clients" : t === "company" ? "Company" : "Account"}
          </button>
        ))}
      </div>

      {/* Clients tab */}
      {tab === "clients" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setEditTarget({ name: "", address: "", emailTo: [], cc: [], paymentTermsDays: 30 })}
              className="px-4 py-2 rounded-lg bg-primary text-primary-content text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              + Add Client
            </button>
          </div>
          {loadingClients ? (
            <div className="flex justify-center py-12"><span className="loading loading-spinner loading-lg text-primary" /></div>
          ) : clients.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-12 text-center">
              <p className="text-base-content/30 text-sm">No clients yet. Add your first client above.</p>
            </div>
          ) : clients.map((c) => {
            const s = clientStats[c._id] || {};
            const fmt = (cents) => cents != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100) : null;
            return (
              <div key={c._id} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-4 flex items-start justify-between gap-4 hover:bg-white/[0.07] transition-colors">
                <div className="min-w-0 space-y-1.5">
                  <p className="font-bold text-base-content">{c.name}</p>
                  {c.address && <p className="text-xs text-base-content/40 whitespace-pre-line">{c.address}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-base-content/40">
                    <span>Net {c.paymentTermsDays}d</span>
                    {!c.showDueDate && <span className="text-warning/70">No due date on PDF</span>}
                  </div>
                  {s.invoiceCount > 0 && (
                    <div className="flex flex-wrap gap-3 text-xs pt-0.5">
                      <span className="text-base-content/50">{s.invoiceCount} invoice{s.invoiceCount !== 1 ? "s" : ""}</span>
                      <span className="text-emerald-400/80">Billed: {fmt(s.totalCents)}</span>
                      {s.outstandingCents > 0 && <span className="text-amber-400/80">Outstanding: {fmt(s.outstandingCents)}</span>}
                      {s.avgDaysToPay != null && (
                        <span className={`${s.avgDaysToPay <= 30 ? "text-emerald-400/80" : s.avgDaysToPay <= 45 ? "text-amber-400/80" : "text-red-400/80"}`}>
                          Avg pay: {s.avgDaysToPay}d
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => setEditTarget(c)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] hover:border-white/20 transition-all">
                  Edit
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Company tab */}
      {tab === "company" && (
        <form onSubmit={handleCompanySave} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-4 max-w-sm">
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Company Name</span></label>
            <input className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={companyForm.name} onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text font-semibold">Address</span>
              <span className="label-text-alt text-base-content/40">Shown on PDFs</span>
            </label>
            <textarea className="textarea w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4 py-3" rows={3} placeholder={"123 Main St\nCity, ST 12345"} value={companyForm.address} onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="form-control">
            <label className="label pb-1">
              <span className="label-text font-semibold">Phone</span>
              <span className="label-text-alt text-base-content/40">Shown on PDFs</span>
            </label>
            <input className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" placeholder="(555) 000-0000" value={companyForm.phone} onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          {companyMsg && (
            <p className={`text-sm font-medium ${companyMsg.type === "success" ? "text-success" : companyMsg.type === "error" ? "text-error" : "text-base-content/60"}`}>{companyMsg.text}</p>
          )}
          <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-content text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity" disabled={savingCompany}>
            {savingCompany ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
          </button>
        </form>
      )}

      {/* Account tab */}
      {tab === "account" && (
        <form onSubmit={handleAccountSave} className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-4 max-w-sm">
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Email</span></label>
            <input type="email" className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="divider text-xs text-base-content/30">Change Password</div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Current Password</span></label>
            <input type="password" className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Required to change password" />
          </div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">New Password</span></label>
            <input type="password" className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          </div>
          <div className="form-control">
            <label className="label pb-1"><span className="label-text font-semibold">Confirm New Password</span></label>
            <input type="password" className="input w-full bg-white/[0.06] border border-white/10 focus:border-primary/60 focus:outline-none px-4" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {accountMsg && (
            <p className={`text-sm font-medium ${accountMsg.type === "success" ? "text-success" : accountMsg.type === "error" ? "text-error" : "text-base-content/60"}`}>{accountMsg.text}</p>
          )}
          <button type="submit" className="w-full py-2.5 rounded-xl bg-primary text-primary-content text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity" disabled={savingAccount}>
            {savingAccount ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
          </button>
        </form>
      )}

      {editTarget && (
        <ClientFormModal
          client={editTarget}
          onSave={(result, isNew) => {
            if (isNew) setClients((prev) => [...prev, result]);
            else setClients((prev) => prev.map((c) => c._id === result._id ? result : c));
            setEditTarget(null);
          }}
          onDelete={(id) => { setClients((prev) => prev.filter((c) => c._id !== id)); setEditTarget(null); }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
