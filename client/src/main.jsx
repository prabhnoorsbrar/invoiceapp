import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.documentElement.setAttribute("data-theme", "business");


createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
