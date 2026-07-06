import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./global.css";
import "./styles/empire.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
