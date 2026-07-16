import { Button } from "@/components/ui/button"

/** Mostrado quando a checagem de sessão falha por erro (rede/servidor), não por ausência de sessão. */
export function SessionErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div>
        <h1 className="text-lg font-semibold">Não foi possível verificar sua sessão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Isso pode ser um problema de conexão. Verifique sua internet e tente novamente.
        </p>
      </div>
      <Button onClick={onRetry}>Tentar novamente</Button>
    </div>
  )
}
