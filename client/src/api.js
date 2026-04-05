// client/src/api.js
const base = (import.meta.env?.VITE_API_BASE || (import.meta.env?.DEV ? "http://localhost:4000" : "")).replace(/\/+$/, "");

let currentUser = null;
let currentCompany = null;

try {
  const storedUser = localStorage.getItem("currentUser");
  currentUser = storedUser ? JSON.parse(storedUser) : null;
} catch {
  currentUser = null;
}

try {
  const storedCompany = localStorage.getItem("currentCompany");
  currentCompany = storedCompany ? JSON.parse(storedCompany) : null;
} catch {
  currentCompany = null;
}

export function setCurrentUser(user) {
  currentUser = user || null;
  if (user) localStorage.setItem("currentUser", JSON.stringify(user));
  else localStorage.removeItem("currentUser");
}

export function getCurrentUser() {
  return currentUser;
}

export function setCurrentCompany(company) {
  currentCompany = company || null;
  if (company) localStorage.setItem("currentCompany", JSON.stringify(company));
  else localStorage.removeItem("currentCompany");
}

export function getCurrentCompany() {
  return currentCompany;
}

export function getSessionProfile() {
  return { user: currentUser, company: currentCompany };
}

export function applyAuthResult(result = {}) {
  const { user, company } = result;
  if (user !== undefined) setCurrentUser(user);
  if (company !== undefined) setCurrentCompany(company);
  return getSessionProfile();
}

export async function logout() {
  try {
    await fetch(`${base}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // best-effort
  }
  setCurrentUser(null);
  setCurrentCompany(null);
}

async function request(path, { method = "GET", body, ...opts } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    if (res.status === 401 && currentUser) {
      setCurrentUser(null);
      setCurrentCompany(null);
    }
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // Auth
  async register(email, password, companyName) {
    return request(`/api/auth/register`, {
      method: "POST",
      body: { email, password, companyName },
    });
  },
  async login(email, password) {
    return request(`/api/auth/login`, { method: "POST", body: { email, password } });
  },

  // KPIs
  kpis() {
    return request(`/api/invoices/kpis`);
  },

  // Clients
  listClients() {
    return request(`/api/clients`);
  },
  createClient(payload) {
    return request(`/api/clients`, { method: "POST", body: payload });
  },

  // Routes
  listRoutesByClient(clientId) {
    return request(`/api/routes/${encodeURIComponent(clientId)}`);
  },
  createRoutePreset(payload) {
    return request(`/api/routes`, { method: "POST", body: payload });
  },

  // Invoices
  lastInvoiceNumber() {
    return request(`/api/invoices/last-number`);
  },
  listOutstanding() {
    return request(`/api/invoices/outstanding`);
  },
  createInvoice(payload) {
    return request(`/api/invoices`, { method: "POST", body: payload });
  },
  markPaid(id, body) {
    return request(`/api/invoices/${encodeURIComponent(id)}/mark-paid`, {
      method: "POST",
      body,
    });
  },
  reopen(id) {
    return request(`/api/invoices/${encodeURIComponent(id)}/reopen`, { method: "POST" });
  },
  search(q) {
    return request(`/api/invoices/search?q=${encodeURIComponent(q)}`);
  },
  deleteInvoice(id) {
    return request(`/api/invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
