import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useSession } from "@/features/session/use-session"
import { useLogout } from "@/features/auth/api"

export function HomePage() {
  const { user } = useSession()
  const logoutMutation = useLogout()

  if (!user) return null

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {user.name.split(" ")[0]}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pronto para treinar para o TAP?</p>
      </div>
      <Button asChild size="lg">
        <Link to="/quiz/iniciar">Iniciar quiz</Link>
      </Button>
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/perfil">Meu perfil</Link>
        </Button>
        <Button variant="outline" onClick={() => logoutMutation.mutate()} loading={logoutMutation.isPending}>
          {logoutMutation.isPending ? "Saindo…" : "Sair"}
        </Button>
      </div>
    </div>
  )
}
