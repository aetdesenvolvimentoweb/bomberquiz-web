import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { useLogout } from "@/features/auth/api"
import { useAcceptConsent } from "@/features/profile/api"
import { ApiError } from "@/lib/api/errors"
import { useLocation, useNavigate, type Location } from "react-router-dom"
import { toast } from "sonner"

export function ConsentRenewalPage() {
  const acceptConsentMutation = useAcceptConsent()
  const logoutMutation = useLogout()
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: Location } | null)?.from

  async function handleAccept() {
    try {
      await acceptConsentMutation.mutateAsync()
      toast.success("Termos aceitos.")
      navigate(from ? { pathname: from.pathname, search: from.search, hash: from.hash } : "/inicio", { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível registrar seu aceite."
      toast.error(message)
    }
  }

  return (
    <AuthLayout title="Termos atualizados" description="Precisamos que você reaceite nossos termos para continuar">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Atualizamos os Termos de Uso e a Política de Privacidade. Revise antes de continuar:{" "}
          <a href="/termos" target="_blank" rel="noreferrer" className="underline">
            Termos de Uso
          </a>{" "}
          e{" "}
          <a href="/privacidade" target="_blank" rel="noreferrer" className="underline">
            Política de Privacidade
          </a>
          .
        </p>

        <div className="flex gap-2">
          <Button onClick={handleAccept} loading={acceptConsentMutation.isPending} className="flex-1">
            {acceptConsentMutation.isPending ? "Registrando…" : "Aceitar e continuar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            loading={logoutMutation.isPending}
            className="flex-1"
          >
            {logoutMutation.isPending ? "Saindo…" : "Recusar e sair"}
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
