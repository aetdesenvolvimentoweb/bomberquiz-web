import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSession } from "@/features/session/use-session"
import { useLogout } from "@/features/auth/api"
import { useMySubscription } from "@/features/subscription/subscription-api"

// Aviso proativo de expiração: só faz sentido nos últimos dias, para não virar
// ruído visual o ciclo inteiro da assinatura.
const EXPIRY_WARNING_THRESHOLD_DAYS = 3

export function HomePage() {
  const { user } = useSession()
  const logoutMutation = useLogout()
  const { data: subscription } = useMySubscription()

  if (!user) return null

  const showExpiringSoonWarning =
    subscription?.access_status === "active" &&
    subscription.current_subscription !== null &&
    subscription.current_subscription.remaining_days <= EXPIRY_WARNING_THRESHOLD_DAYS

  const showInactiveWarning = subscription?.access_status === "inactive"

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {showExpiringSoonWarning && subscription?.current_subscription && (
        <Card className="w-full border-primary bg-primary/5 text-left">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm">
              Sua assinatura vence em {subscription.current_subscription.remaining_days}{" "}
              {subscription.current_subscription.remaining_days === 1 ? "dia" : "dias"}.
            </p>
            <Button asChild size="sm">
              <Link to="/planos">Renovar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {showInactiveWarning && (
        <Card className="w-full border-destructive bg-destructive/10 text-left">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm">Seu acesso ao quiz está bloqueado. Assine um plano para continuar.</p>
            <Button asChild size="sm">
              <Link to="/planos">Assinar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

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
