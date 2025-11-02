// client/src/api.js
const base = (import.meta.env?.VITE_API_BASE || "http://localhost:4000").replace(/\/+$/, "");

let token = localStorage.getItem("jwt") || "";
let currentUser = null;
let currentCompany = null;

try {
  const storedUser = localStorage.getItem("currentUser");
  currentUser = storedUser ? JSON.parse(storedUser) : null;
} catch (err) {
  currentUser = null;
}

try {
  const storedCompany = localStorage.getItem("currentCompany");
  currentCompany = storedCompany ? JSON.parse(storedCompany) : null;
} catch (err) {
  currentCompany = null;
}
export function setToken(t) {
  token = t || "";
  if (t) localStorage.setItem("jwt", t);
  else localStorage.removeItem("jwt");
}
export function getToken() {
  return token;
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
  const { token: nextToken, user, company } = result;
  if (nextToken) setToken(nextToken);
  if (user !== undefined) setCurrentUser(user);
  if (company !== undefined) setCurrentCompany(company);
  return getSessionProfile();
}

export function logout() {
  setToken("");
  setCurrentUser(null);
  setCurrentCompany(null); // clears localStorage too
}

function headers(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request(path, { method = "GET", body, ...opts } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: headers(opts.headers),
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  });

  // Try to parse JSON even on error, to surface server messages
  let data = null;
  const text = await res.text(); // handle empty bodies safely
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    // Auto-logout on 401 if we were authenticated
    if (res.status === 401 && token) logout();
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

  // Routes (for preset picker later)
  listRoutesByClient(clientId) {
    return request(`/api/routes/${encodeURIComponent(clientId)}`);
  },
  createRoutePreset(payload) {
    return request(`/api/routes`, { method: "POST", body: payload });
  },

  // Invoices
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
};
