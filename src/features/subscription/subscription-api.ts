import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type Plan = paths["/plans"]["get"]["responses"][200]["content"]["application/json"]["items"][number]
export type CheckoutBody = NonNullable<paths["/me/checkout"]["post"]["requestBody"]>["content"]["application/json"]
export type CheckoutResponse = paths["/me/checkout"]["post"]["responses"][201]["content"]["application/json"]
export type MySubscriptionResponse = paths["/me/subscription"]["get"]["responses"][200]["content"]["application/json"]
export type Payment = paths["/me/payments"]["get"]["responses"][200]["content"]["application/json"]["items"][number]
export type RefundResponse = paths["/me/payments/{id}/refund"]["post"]["responses"][200]["content"]["application/json"]

// Exportada porque o admin de planos precisa invalidá-la ao reajustar um preço
// (features/subscription/plans-admin-api.ts) — duplicar a tupla lá deixaria as
// duas livres para divergirem em silêncio, e o sintoma seria um reajuste que
// "não pega" na tela do cliente.
export const PLANS_QUERY_KEY = ["subscription", "plans"] as const
export const MY_SUBSCRIPTION_QUERY_KEY = ["subscription", "me"] as const
const MY_PAYMENTS_QUERY_KEY = ["subscription", "payments"] as const

export function usePlans() {
  return useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: () => unwrap(apiClient.GET("/plans")),
  })
}

export function useCheckout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CheckoutBody) => unwrap(apiClient.POST("/me/checkout", { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY })
    },
  })
}

/**
 * `pollForPaymentId` refaz a cada 3s enquanto **aquele** pagamento seguir em
 * `pending_payments` — mesmo formato condicional de `useAiGenerationJob`
 * (Módulo 7, removido do repo, git 954c6d0), único precedente de
 * poll-até-estado-terminal do projeto. Sem endpoint de status por pagamento,
 * a confirmação é sempre via este GET.
 *
 * A condição é o pagamento, e NÃO `access_status`. A versão anterior parava o
 * poll quando o acesso estava ativo — o que quebrava exatamente o caso mais
 * comum, a **renovação**: quem já tem assinatura vigente chega ao checkout com
 * `access_status: "active"`, então o poll nunca começava e a tela de pagamento
 * congelava em "Aguardando confirmação" para sempre, mesmo com o pagamento já
 * aprovado no banco (incidente 2026-08-28, cartão em produção).
 */
export function useMySubscription(options?: { pollForPaymentId?: string }) {
  return useQuery({
    queryKey: MY_SUBSCRIPTION_QUERY_KEY,
    queryFn: () => unwrap(apiClient.GET("/me/subscription")),
    refetchInterval: (query) => {
      const paymentId = options?.pollForPaymentId
      if (!paymentId) return false
      const data = query.state.data
      if (!data) return 3000
      return data.pending_payments.some((payment) => payment.id === paymentId) ? 3000 : false
    },
  })
}

export interface MyPaymentsFilters {
  status?: string
  createdFrom?: string
  createdTo?: string
  page: number
  pageSize: number
}

export function useMyPayments(filters: MyPaymentsFilters) {
  return useQuery({
    queryKey: [...MY_PAYMENTS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/me/payments", {
          params: {
            query: {
              status: filters.status,
              created_from: filters.createdFrom,
              created_to: filters.createdTo,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

export function useRequestRefund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason?: string }) =>
      unwrap(apiClient.POST("/me/payments/{id}/refund", { params: { path: { id: paymentId } }, body: { reason } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_PAYMENTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY })
    },
  })
}
