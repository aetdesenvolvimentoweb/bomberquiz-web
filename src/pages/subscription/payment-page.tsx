import { useEffect, useRef, useState } from "react"
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

  const { data: subscription, isPending } = useMySubscription({ pollForPaymentId: paymentId })

  const pendingEntry = subscription?.pending_payments.find((payment) => payment.id === paymentId)
  const initialExpiresAt = initialCheckout?.method === "pix" ? initialCheckout.expires_at : null
  const remainingSeconds = useCountdown(pendingEntry?.expires_at ?? initialExpiresAt)

  // O desfecho é deste pagamento, não do acesso do usuário. Numa renovação o
  // acesso já está ativo antes de pagar, então `access_status` não distingue
  // "aprovado" de "recusado" — usá-lo mostrava "Pagamento confirmado" mesmo
  // para um cartão negado. `refund_eligible_payments` é a lista de pagamentos
  // com status `paid` na janela de 7 dias: um pagamento recém-aprovado sempre
  // está lá, e um recusado nunca.
  const confirmed = subscription?.refund_eligible_payments.some((payment) => payment.id === paymentId) ?? false

  // Só afirmamos "não confirmado" se chegamos a ver o pagamento pendente. Sem
  // isso, abrir o link de um pagamento antigo (fora da janela de reembolso,
  // portanto ausente das duas listas) anunciaria uma falha que não houve.
  const sawPending = useRef(false)
  if (pendingEntry) sawPending.current = true

  if (isPending || !subscription) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  // Confirmado: saiu de pending_payments e consta como pago.
  if (!pendingEntry && confirmed) {
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

  // Saiu de pending_payments sem virar pago: recusado ou expirado.
  if (!pendingEntry && sawPending.current) {
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

  // Nunca esteve pendente nem consta como pago: link antigo ou já resolvido por
  // outro caminho. O histórico tem o status real; não inventamos um aqui.
  if (!pendingEntry) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Pagamento não encontrado em aberto</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este pagamento não está mais aguardando confirmação. Consulte o histórico para ver a situação dele.
        </p>
        <Button asChild className="mt-6">
          <Link to="/assinatura/pagamentos">Ver histórico</Link>
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

      {/* Saída manual: esta tela espera indefinidamente, e sem isto quem ficasse
          preso aqui não teria para onde ir (incidente 2026-08-28). */}
      <Button asChild variant="link" className="mt-4 text-muted-foreground">
        <Link to="/assinatura">Ver minha assinatura</Link>
      </Button>
    </div>
  )
}
