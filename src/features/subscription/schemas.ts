import { z } from "zod"
import { ApiError } from "@/lib/api/errors"

export function formatCentsToBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)
}

// ─── Admin de planos (SUB-RF-001 CA-2) ──────────────────────────────────────

/**
 * O banco guarda centavos; o admin digita reais. A conversão mora aqui, num
 * lugar só, porque errá-la significa vender por 1/100 ou por 100× do preço —
 * e a tela não teria como desconfiar. Aceita vírgula (padrão pt-BR) e ponto.
 */
export function parseBRLToCents(input: string): number | null {
  const normalized = input.trim().replace(/\./g, "").replace(",", ".")
  if (normalized === "" || !/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

/** Inverso de `parseBRLToCents`, para preencher o formulário. Sem "R$". */
export function formatCentsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",")
}

/** Preço de cartão sugerido: +10% sobre o PIX (§ Regras gerais do módulo). */
export const CARD_PRICE_MARKUP = 1.1

export function suggestCardPriceCents(pixPriceCents: number): number {
  return Math.round(pixPriceCents * CARD_PRICE_MARKUP)
}

const priceField = z
  .string()
  .min(1, "Informe o preço")
  .refine((value) => parseBRLToCents(value) !== null, "Use o formato 34,90")
  // Piso do Mercado Pago — ele recusa cobrança abaixo de R$1,00, e o backend
  // repete a regra. Barrar aqui evita um 422 depois de preencher tudo.
  .refine((value) => (parseBRLToCents(value) ?? 0) >= 100, "O preço mínimo é R$ 1,00")

export const planFormSchema = z
  .object({
    pixPrice: priceField,
    cardPrice: priceField,
    maxInstallments: z.coerce.number().int().min(1, "No mínimo 1×").max(12, "No máximo 12×"),
    isActive: z.boolean(),
  })
  .refine(
    (values) => (parseBRLToCents(values.cardPrice) ?? 0) >= (parseBRLToCents(values.pixPrice) ?? 0),
    { path: ["cardPrice"], message: "O preço no cartão não pode ser menor que o do PIX" },
  )

export type PlanFormValues = z.infer<typeof planFormSchema>

/**
 * Quando o dinheiro reaparece para o cliente, por método de pagamento.
 *
 * O estorno em si é imediato e terminal — a Orders API do Mercado Pago devolve
 * a order já como `refunded` na mesma chamada, e o `status` do pagamento vira
 * `refunded` no ato. O que varia é só o caminho de volta até a conta ou a
 * fatura do cliente, que não passa pelo BomberQuiz nem é consultável pela API
 * do MP. Por isso a tela informa um prazo em vez de acompanhar um estado: não
 * existe estado nenhum para acompanhar.
 *
 * Texto espelhado em `api/src/infra/email/resend.adapter.ts` §
 * `REFUND_TIMING_TEXT` (repositórios separados, duplicação inevitável) — se
 * mudar aqui, mudar lá.
 */
export const REFUND_TIMING_TEXT: Record<string, string> = {
  pix: "O valor volta para a conta usada no pagamento, normalmente em poucos minutos.",
  card:
    "O crédito aparece assim que o banco emissor do cartão processar o estorno — costuma ser rápido, mas o prazo " +
    "é do banco e pode chegar a 10 dias úteis. Se a fatura atual já fechou, o valor entra na seguinte.",
  mp_balance: "O valor volta para o seu saldo em Mercado Pago, normalmente em poucos minutos.",
}

/** Versão curta, para caber ao lado do status na tabela. */
export const REFUND_TIMING_SHORT: Record<string, string> = {
  pix: "Crédito na conta em poucos minutos.",
  card: "Crédito na fatura em até 10 dias úteis.",
  mp_balance: "Crédito no saldo em poucos minutos.",
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

export function refundErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "payment_not_found":
      return "Pagamento não encontrado."
    case "payment_not_refundable":
      return "Este pagamento não pode ser reembolsado."
    case "refund_window_expired":
      return "O prazo de 7 dias para reembolso já passou."
    case "refund_gateway_error":
      return "Não foi possível falar com o Mercado Pago agora. Tente novamente em instantes."
    default:
      return error.message
  }
}
