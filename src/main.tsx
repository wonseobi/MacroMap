import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { loadSettings, applyTheme } from "@/lib/settings"

// Apply the saved theme before first paint to avoid a flash of the wrong palette.
applyTheme(loadSettings().theme)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
