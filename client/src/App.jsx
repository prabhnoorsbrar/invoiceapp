import React, { useState } from "react";
import CreateInvoice from "./pages/CreateInvoice";
import Outstanding from "./pages/Outstanding";
import Search from "./pages/Search";

export default function App() {
  const [view, setView] = useState("outstanding");

  return (
    <div className="p-4">
      <header className="flex gap-2 mb-4">
        <button
          onClick={() => setView("create")}
          className={`px-4 py-2 rounded ${
            view === "create" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setView("outstanding")}
          className={`px-4 py-2 rounded ${
            view === "outstanding" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          Outstanding
        </button>
        <button
          onClick={() => setView("search")}
          className={`px-4 py-2 rounded ${
            view === "search" ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          Search
        </button>
      </header>

      {view === "create" && <CreateInvoice />}
      {view === "outstanding" && <Outstanding />}
      {view === "search" && <Search />}
    </div>
  );
}
