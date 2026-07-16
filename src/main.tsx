import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "@/app/app"
import { installGlobalErrorHandlers } from "@/lib/global-error-handler"
import "@/index.css"

installGlobalErrorHandlers()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
