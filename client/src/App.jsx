import React, { useState } from "react";
import { logout, getCurrentUser, getCurrentCompany } from "./api";
import CreateInvoice from "./pages/CreateInvoice";
import Outstanding from "./pages/Outstanding";
import Search from "./pages/Search";
import Login from "./pages/Login";

export default function App() {
  const [authed, setAuthed] = useState(() => !!getCurrentUser());
  const [view, setView] = useState("outstanding");
  const [user, setUser] = useState(() => getCurrentUser());
  const [company, setCompany] = useState(() => getCurrentCompany());

  // ❗ This prevents the full app from showing if user isn't logged in
  if (!authed) {
    return (
      <Login
        onSuccess={(nextUser, nextCompany) => {
          setAuthed(true);
          setUser(nextUser || null);
          setCompany(nextCompany || null);
        }}
      />
    );
  }

  const navItems = [
    { id: "create", label: "Create Invoice" },
    { id: "outstanding", label: "Outstanding" },
    { id: "search", label: "Search" },
  ];

  return (
    <div className="min-h-screen bg-base-200">
      <header className="bg-base-100 border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-base hidden sm:block">US Pride Logistics</span>
          <div className="tabs tabs-boxed bg-base-200">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`tab ${view === item.id ? "tab-active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { logout(); setAuthed(false); setUser(null); setCompany(null); }}
          className="btn btn-ghost btn-sm"
        >
          Logout
        </button>
      </header>
      <main className="p-4 max-w-7xl mx-auto">

      
      {view === "create" && <CreateInvoice company={company} currentUser={user} />}
      {view === "outstanding" && <Outstanding />}
      {view === "search" && <Search />}
      </main>
    </div>
  );
}
