/**
 * Cobre erros que escapam do React (fora do ciclo de render — ex.: dentro de
 * event handlers assíncronos, setTimeout) e promises rejeitadas sem catch,
 * casos que o RouteErrorBoundary não alcança. Sem serviço externo de
 * monitoramento (Sentry) por enquanto: loga estruturado no console, único
 * canal de visibilidade disponível hoje.
 */
export function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    console.error("[GlobalErrorHandler] erro não tratado", {
      type: "uncaught_error",
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error instanceof Error ? event.error.stack : undefined,
      timestamp: new Date().toISOString(),
    })
  })

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason
    console.error("[GlobalErrorHandler] promise rejeitada sem tratamento", {
      type: "unhandled_rejection",
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      timestamp: new Date().toISOString(),
    })
  })
}
