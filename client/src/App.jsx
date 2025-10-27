import React, { useState, useEffect } from "react";
import { logout } from "./api";
import CreateInvoice from "./pages/CreateInvoice";
import Outstanding from "./pages/Outstanding";
import Search from "./pages/Search";
import Login from "./pages/Login";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState("outstanding");

  // On first load, check for saved token
  useEffect(() => {
    const token = localStorage.getItem("jwt");
    setAuthed(!!token);
  }, []);

  // ❗ This prevents the full app from showing if user isn't logged in
  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="p-4">
      <header className="flex gap-2 mb-4 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setView("create")}
            className={`px-4 py-2 rounded ${view === "create" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            Create
          </button>
          <button
            onClick={() => setView("outstanding")}
            className={`px-4 py-2 rounded ${view === "outstanding" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            Outstanding
          </button>
          <button
            onClick={() => setView("search")}
            className={`px-4 py-2 rounded ${view === "search" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
          >
            Search
          </button>
        </div>
        <button
          onClick={() => {
            logout();
            setAuthed(false);
          }}
          className="text-sm underline"
        >
          Logout
        </button>
      </header>

      {view === "create" && <CreateInvoice />}
      {view === "outstanding" && <Outstanding />}
      {view === "search" && <Search />}
    </div>
  );
}
