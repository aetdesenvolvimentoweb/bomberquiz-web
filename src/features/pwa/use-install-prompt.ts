import { useCallback, useEffect, useState } from "react"
import { reportPwaEvent } from "@/features/pwa/report-pwa-event"

const DISMISS_STORAGE_KEY = "bomberquiz:install-prompt-dismissed"
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export type InstallPlatform = "android" | "ios"

function isStandaloneDisplay(): boolean {
  const isDisplayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false
  // navigator.standalone é a forma do Safari/iOS de expor o mesmo estado antes de
  // display-mode: standalone ser suportado.
  const isIosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return isDisplayModeStandalone || isIosStandalone
}

function isIosSafari(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function wasDismissedRecently(): boolean {
  const dismissedAt = Number(localStorage.getItem(DISMISS_STORAGE_KEY))
  return Number.isFinite(dismissedAt) && dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
}

// Detecta a plataforma pra decidir como oferecer a instalação do PWA: Android/Chrome/Edge
// disparam `beforeinstallprompt` e permitem instalar programaticamente; iOS Safari nunca
// dispara esse evento, então só é possível mostrar instruções manuais (Compartilhar →
// Adicionar à Tela de Início).
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandaloneDisplay)
  const [dismissed, setDismissed] = useState(wasDismissedRecently)

  useEffect(() => {
    if (installed) return

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      reportPwaEvent("pwa_install_prompted")
    }

    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [installed])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    reportPwaEvent(outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed", {
      source: "native_prompt",
    })
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()))
    setDismissed(true)
    reportPwaEvent("pwa_install_dismissed", { source: "banner" })
  }, [])

  const platform: InstallPlatform | null = installed || dismissed ? null : deferredPrompt ? "android" : isIosSafari() ? "ios" : null

  return { platform, promptInstall, dismiss }
}
