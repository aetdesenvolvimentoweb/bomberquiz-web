import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type Plan = paths["/plans"]["get"]["responses"][200]["content"]["application/json"]["items"][number]
export type CheckoutBody = NonNullable<paths["/me/checkout"]["post"]["requestBody"]>["content"]["application/json"]
export type CheckoutResponse = paths["/me/checkout"]["post"]["responses"][201]["content"]["application/json"]
export type MySubscriptionResponse = paths["/me/subscription"]["get"]["responses"][200]["content"]["application/json"]

const PLANS_QUERY_KEY = ["subscription", "plans"] as const
export const MY_SUBSCRIPTION_QUERY_KEY = ["subscription", "me"] as const

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
 * `poll: true` refaz a cada 3s enquanto o pagamento seguir em `pending_payments`
 * — mesmo formato condicional de `useAiGenerationJob` (Módulo 7, removido do
 * repo, git 954c6d0), único precedente de poll-até-estado-terminal do projeto.
 * Sem endpoint de status por pagamento, a confirmação é sempre via este GET.
 */
export function useMySubscription(options?: { poll?: boolean }) {
  return useQuery({
    queryKey: MY_SUBSCRIPTION_QUERY_KEY,
    queryFn: () => unwrap(apiClient.GET("/me/subscription")),
    refetchInterval: (query) => {
      if (!options?.poll) return false
      const data = query.state.data
      if (!data) return 3000
      const stillPending = data.access_status === "inactive" && data.pending_payments.length > 0
      return stillPending ? 3000 : false
    },
  })
}
