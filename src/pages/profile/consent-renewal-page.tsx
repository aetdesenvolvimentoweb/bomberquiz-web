import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { useAcceptConsent } from "@/features/profile/api"
import { useLogout } from "@/features/auth/api"
import { ApiError } from "@/lib/api/errors"

export function ConsentRenewalPage() {
  const acceptConsentMutation = useAcceptConsent()
  const logoutMutation = useLogout()

  async function handleAccept() {
    try {
      await acceptConsentMutation.mutateAsync()
      toast.success("Termos aceitos.")
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
          <Button onClick={handleAccept} disabled={acceptConsentMutation.isPending} className="flex-1">
            {acceptConsentMutation.isPending ? "Registrando…" : "Aceitar e continuar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex-1"
          >
            Recusar e sair
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
