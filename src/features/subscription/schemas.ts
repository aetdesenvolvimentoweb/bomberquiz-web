import { ApiError } from "@/lib/api/errors"

export function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

// Códigos retornados por POST /me/checkout e POST /me/payments/:id/refund
// (api/src/http/schemas/subscriptions.schemas.ts § mapSubscriptionErrorToResponse)
// — mensagem específica por código em vez de um catch-all genérico.
export function checkoutErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "plan_not_available":
      return "Este plano não está mais disponível. Escolha outro."
    case "card_token_required":
      return "Não foi possível validar os dados do cartão. Tente novamente."
    case "invalid_installments": {
      const max = error.details?.max_installments
      return typeof max === "number" ? `Escolha entre 1 e ${max} parcelas.` : "Número de parcelas inválido."
    }
    case "too_many_pending_checkouts":
      return "Você já tem um pagamento em andamento. Aguarde a confirmação antes de tentar de novo."
    case "payment_gateway_error":
      return "Não foi possível falar com o Mercado Pago agora. Tente novamente em instantes."
    default:
      return error.message
  }
}
