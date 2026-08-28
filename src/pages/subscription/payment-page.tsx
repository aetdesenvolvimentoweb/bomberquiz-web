import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { CheckoutResponse } from "@/features/subscription/subscription-api"
import { useMySubscription } from "@/features/subscription/subscription-api"

function useCountdown(deadlineIso: string | null): number | null {
  const deadline = deadlineIso === null ? null : new Date(deadlineIso).getTime()
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    deadline === null ? null : Math.max(0, Math.round((deadline - Date.now()) / 1000)),
  )

  useEffect(() => {
    if (deadline === null) return
    const tick = () => setRemainingSeconds(Math.max(0, Math.round((deadline - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  return remainingSeconds
}

function formatMmSs(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function PaymentPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const location = useLocation()
  const initialCheckout = (location.state as { checkout?: CheckoutResponse } | null)?.checkout

  const { data: subscription, isPending } = useMySubscription({ poll: true })

  const pendingEntry = subscription?.pending_payments.find((payment) => payment.id === paymentId)
  const initialExpiresAt = initialCheckout?.method === "pix" ? initialCheckout.expires_at : null
  const remainingSeconds = useCountdown(pendingEntry?.expires_at ?? initialExpiresAt)

  if (isPending || !subscription) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  // Confirmado: o pagamento saiu de pending_payments e o acesso está ativo.
  if (!pendingEntry && subscription.access_status === "active") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Pagamento confirmado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua assinatura está ativa. Bons estudos!
        </p>
        <Button asChild className="mt-6">
          <Link to="/inicio">Ir para o início</Link>
        </Button>
      </div>
    )
  }

  // Saiu de pending_payments mas o acesso segue inativo: falhou ou expirou.
  if (!pendingEntry && subscription.access_status === "inactive") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Pagamento não confirmado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Não foi possível confirmar este pagamento. Você pode tentar novamente.
        </p>
        <Button asChild className="mt-6">
          <Link to="/planos">Ver planos</Link>
        </Button>
      </div>
    )
  }

  const method = initialCheckout?.method ?? pendingEntry?.method

  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Aguardando confirmação</h1>

      {method === "pix" && initialCheckout?.method === "pix" && (
        <div className="mt-6 space-y-4">
          {initialCheckout.qr_code_base64 && (
            <img
              src={`data:image/png;base64,${initialCheckout.qr_code_base64}`}
              alt="QR Code PIX"
              className="mx-auto h-56 w-56 rounded-lg border"
            />
          )}
          {initialCheckout.qr_code_text && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(initialCheckout.qr_code_text ?? "")
                toast.success("Código copiado")
              }}
            >
              Copiar código PIX
            </Button>
          )}
          {remainingSeconds !== null && (
            <p className="text-sm text-muted-foreground">
              Expira em <span className="font-mono font-semibold">{formatMmSs(remainingSeconds)}</span>
            </p>
          )}
        </div>
      )}

      {method === "card" && (
        <p className="mt-6 text-sm text-muted-foreground">
          Estamos confirmando o pagamento do seu cartão com o Mercado Pago. Isso costuma levar poucos segundos.
        </p>
      )}

      {!method && (
        <p className="mt-6 text-sm text-muted-foreground">
          Aguardando confirmação do pagamento. Se você recarregou esta página, os detalhes de PIX podem não
          aparecer aqui — esta tela atualiza sozinha assim que o pagamento for confirmado.
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    </div>
  )
}
