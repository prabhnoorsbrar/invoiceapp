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
    { id: "outstanding", label: "Outstanding", icon: "📋" },
    { id: "create", label: "Create", icon: "➕" },
    { id: "search", label: "Search", icon: "🔍" },
  ];

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Top header */}
      <header className="bg-base-100 border-b border-base-300 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <span className="font-bold text-lg tracking-tight text-base-content">
          US Pride Logistics
        </span>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                view === item.id
                  ? "bg-primary text-primary-content border-primary"
                  : "border-primary/50 text-primary hover:bg-primary/10 hover:border-primary"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => { logout(); setAuthed(false); setUser(null); setCompany(null); }}
          className="px-3 py-1.5 rounded-lg border-2 border-base-content/40 text-sm font-semibold hover:bg-base-content/10 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto pb-24 md:pb-6">
        {view === "create" && <CreateInvoice company={company} currentUser={user} />}
        {view === "outstanding" && <Outstanding />}
        {view === "search" && <Search />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 flex z-40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
              view === item.id
                ? "text-primary"
                : "text-base-content/50"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
