import { Spinner } from "@/components/ui/spinner"

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Spinner className="h-6 w-6" />
      Carregando…
    </div>
  )
}
