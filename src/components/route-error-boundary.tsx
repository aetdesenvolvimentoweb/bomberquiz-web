import { useEffect } from "react"
import { isRouteErrorResponse, useRouteError } from "react-router-dom"
import { Mascot } from "@/components/mascot"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/errors"
import { captureException } from "@/lib/monitoring/sentry"

/** errorElement de topo do router — cobre erros de render não tratados em qualquer rota. */
export function RouteErrorBoundary() {
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
    captureException(error, error instanceof ApiError ? error.requestId : undefined)
  }, [error])

  // O router não tem rota curinga: endereço inexistente cai aqui como 404.
  // Esse caso tem cara própria — quem chega nele digitou ou seguiu um link
  // errado, não encontrou uma falha do app.
  const notFound = isRouteErrorResponse(error) && error.status === 404

  const message = notFound
    ? "Este endereço não existe ou mudou de lugar."
    : isRouteErrorResponse(error)
      ? `Erro ${error.status}: ${error.statusText}`
      : "Algo deu errado. Tente recarregar a página."

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Mascot pose="lost" alt="Mascote confuso, segurando um mapa de cabeça para baixo" className="w-[140px] sm:w-[160px]" />
      <div>
        <h1 className="text-lg font-semibold">{notFound ? "Página não encontrada" : "Ops, algo deu errado"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={() => window.location.assign("/")}>Voltar ao início</Button>
    </div>
  )
}
