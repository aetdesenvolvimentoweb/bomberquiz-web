import { apiClient } from "@/lib/api/client"

type PwaEventType = "pwa_install_prompted" | "pwa_install_accepted" | "pwa_install_dismissed" | "quiz_offline_period"

// Fire-and-forget: telemetria nunca deve quebrar a UI, por isso engole o erro
// (só loga) em vez de propagar — sem retry/fila, mesmo espírito do restante
// do projeto (ver ADR-0031).
export function reportPwaEvent(eventType: PwaEventType, metadata?: Record<string, unknown>): void {
  apiClient.POST("/events", { body: { event_type: eventType, metadata } }).then(({ error }) => {
    if (error) console.error("[reportPwaEvent] falha ao registrar evento", { eventType, error })
  })
}
