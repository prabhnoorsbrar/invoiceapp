import React, { useEffect, useState } from "react";
import { logout } from "./api"; // from your api.js
import Login from "./pages/Login";
import CreateInvoice from "./pages/CreateInvoice";
import Outstanding from "./pages/Outstanding";
import Search from "./pages/Search";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState("outstanding");

  // on load, check if a token exists in localStorage
  useEffect(() => {
    setAuthed(!!localStorage.getItem("jwt"));
  }, []);

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="p-4">
      <header className="flex items-center justify-between mb-4">
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
          onClick={() => { logout(); setAuthed(false); }}
          className="text-sm text-gray-600 underline"
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
