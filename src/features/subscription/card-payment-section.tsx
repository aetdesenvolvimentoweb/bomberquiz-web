import { useEffect } from "react"
import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react"
import { env } from "@/lib/env"

export interface CardPaymentSubmission {
  cardToken: string
  paymentMethodId: string
  installments: number
  deviceId: string | undefined
}

interface CardPaymentSectionProps {
  amountInCents: number
  maxInstallments: number
  onSubmit: (submission: CardPaymentSubmission) => Promise<void>
  onError: (message: string) => void
}

// window.MP_DEVICE_SESSION_ID é preenchido automaticamente pelo script de
// antifraude que o MercadoPago.js V2 injeta quando `advancedFraudPrevention:
// true` é passado a initMercadoPago — é o Device ID exigido pelo medidor de
// qualidade do MP na Orders API (mesmo endpoint usado pelo PIX).
declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string
  }
}

/**
 * Card Payment Brick (Checkout Transparente sobre a Orders API — ADR de
 * Fatia 3, não Checkout Pro). O Brick coleta e tokeniza os dados do cartão
 * no navegador, incluindo a escolha de parcelas; nós só repassamos o
 * resultado para POST /me/checkout com method=card.
 */
export function CardPaymentSection({ amountInCents, maxInstallments, onSubmit, onError }: CardPaymentSectionProps) {
  useEffect(() => {
    if (!env.MP_PUBLIC_KEY) return
    initMercadoPago(env.MP_PUBLIC_KEY, { locale: "pt-BR", advancedFraudPrevention: true })
  }, [])

  if (!env.MP_PUBLIC_KEY) {
    return (
      <p className="text-sm text-muted-foreground">Pagamento por cartão indisponível no momento. Use o PIX.</p>
    )
  }

  return (
    <CardPayment
      initialization={{ amount: amountInCents / 100 }}
      customization={{ paymentMethods: { minInstallments: 1, maxInstallments } }}
      locale="pt-BR"
      onSubmit={async (formData) => {
        try {
          await onSubmit({
            cardToken: formData.token,
            paymentMethodId: formData.payment_method_id,
            installments: formData.installments,
            deviceId: window.MP_DEVICE_SESSION_ID,
          })
        } catch (err) {
          onError(err instanceof Error ? err.message : "Não foi possível processar o pagamento.")
          throw err
        }
      }}
      onError={(error) => onError(error.message ?? "Não foi possível carregar o formulário de cartão.")}
    />
  )
}
