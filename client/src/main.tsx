import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import App from "./App";
import "./index.css";

// Apply theme before first render to prevent flash
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
