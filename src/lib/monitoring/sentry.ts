import * as Sentry from "@sentry/react"
import { env } from "@/lib/env"

// ADR-0031: monitoramento de erro é o "próximo passo natural" quando houver
// usuários reais — free tier (~5k eventos/mês) cobre o estágio atual do
// produto. No-op se VITE_SENTRY_DSN não estiver configurada (dev/CI sem conta).
export function initSentry(): void {
  if (!env.SENTRY_DSN) return

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Nunca true: e-mail/nome do usuário não podem ir pra um serviço terceiro
    // sem mascaramento (mesma disciplina já aplicada aos logs de e-mail no
    // backend — cuidado LGPD).
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) {
        delete event.user.email
        delete event.user.username
      }
      return event
    },
  })
}

/** Correlaciona com o request_id do envelope de erro da API (ver docs/arquitetura.md). */
export function captureException(err: unknown, requestId?: string): void {
  if (!env.SENTRY_DSN) return
  Sentry.captureException(err, requestId ? { tags: { request_id: requestId } } : undefined)
}
