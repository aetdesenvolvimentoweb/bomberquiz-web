import { useEffect } from "react"
import { isRouteErrorResponse, useRouteError } from "react-router-dom"
import { Button } from "@/components/ui/button"

/** errorElement de topo do router — cobre erros de render não tratados em qualquer rota. */
export function RouteErrorBoundary() {
  const error = useRouteError()

  useEffect(() => {
    console.error(error)
  }, [error])

  const message = isRouteErrorResponse(error)
    ? `Erro ${error.status}: ${error.statusText}`
    : "Algo deu errado. Tente recarregar a página."

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div>
        <h1 className="text-lg font-semibold">Ops, algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={() => window.location.assign("/")}>Voltar ao início</Button>
    </div>
  )
}
