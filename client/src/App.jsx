import React, { useState } from "react";
import { logout, getCurrentUser, getCurrentCompany, setCurrentUser } from "./api";
import CreateInvoice from "./pages/CreateInvoice";
import Outstanding from "./pages/Outstanding";
import Search from "./pages/Search";
import Login from "./pages/Login";
import Settings from "./pages/Settings";

export default function App() {
  const [authed, setAuthed] = useState(() => !!getCurrentUser());
  const [view, setView] = useState("outstanding");
  const [user, setUser] = useState(() => getCurrentUser());
  const [company, setCompany] = useState(() => getCurrentCompany());
  const [prefill, setPrefill] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  React.useEffect(() => {
    function handleExpired() {
      setAuthed(false);
      setUser(null);
      setCompany(null);
      setSessionExpired(true);
    }
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  if (!authed) {
    return (
      <Login
        sessionExpired={sessionExpired}
        onSuccess={(nextUser, nextCompany) => {
          setSessionExpired(false);
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
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-lg border-b border-white/[0.08]" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(109,40,217,0.14) 50%, rgba(15,23,42,0.85) 100%)", backdropFilter: "blur(20px)" }}>
        <span className="font-black text-xl tracking-tight text-base-content">
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

        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("settings")}
            title="Settings"
            className={`p-2 rounded-lg border transition-colors ${view === "settings" ? "border-primary/50 text-primary bg-primary/10" : "border-white/10 text-base-content/40 hover:text-base-content hover:border-white/20 hover:bg-white/[0.06]"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button
            onClick={() => { logout(); setAuthed(false); setUser(null); setCompany(null); }}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-sm font-semibold text-base-content/60 hover:text-base-content hover:bg-white/[0.11] hover:border-white/20 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto pb-24 md:pb-6">
        {view === "create" && <CreateInvoice company={company} currentUser={user} prefill={prefill} onPrefillConsumed={() => setPrefill(null)} />}
        {view === "outstanding" && <Outstanding company={company} currentUser={user} />}
        {view === "search" && <Search onDuplicate={(r) => { setPrefill(r); setView("create"); }} company={company} currentUser={user} />}
        {view === "settings" && <Settings currentUser={user} onUserUpdate={(u) => { setUser(u); setCurrentUser(u); }} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08]" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(109,40,217,0.16) 50%, rgba(5,6,10,0.85) 100%)", backdropFilter: "blur(24px)" }}>
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isCreate = item.id === "create";
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className="flex-1 flex flex-col items-center justify-center"
              >
                {isCreate ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all duration-200 shadow-lg ${
                      isActive
                        ? "bg-primary shadow-[0_0_18px_rgba(59,130,246,0.6)] scale-110"
                        : "bg-primary/80 shadow-[0_0_12px_rgba(59,130,246,0.35)] hover:scale-105"
                    }`}>
                      <span className="text-white leading-none">{item.icon}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-primary" : "text-base-content/40"}`}>{item.label}</span>
                  </div>
                ) : (
                  <div className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-2xl transition-all duration-200 ${
                    isActive ? "bg-primary/20 border border-primary/30" : ""
                  }`}>
                    <span className={`text-lg leading-none transition-colors duration-200 ${isActive ? "text-primary" : "text-base-content/30"}`}>
                      {item.icon}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 ${isActive ? "text-primary" : "text-base-content/25"}`}>
                      {item.label}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
