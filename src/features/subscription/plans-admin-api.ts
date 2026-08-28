import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { PLANS_QUERY_KEY } from "./subscription-api"
import type { paths } from "@/lib/api/schema"

export type AdminPlan = paths["/admin/plans"]["get"]["responses"][200]["content"]["application/json"]["items"][number]
export type UpdatePlanBody = NonNullable<
  paths["/admin/plans/{id}"]["patch"]["requestBody"]
>["content"]["application/json"]

const ADMIN_PLANS_QUERY_KEY = ["subscription", "admin-plans"] as const

export function useAdminPlans() {
  return useQuery({
    queryKey: ADMIN_PLANS_QUERY_KEY,
    queryFn: () => unwrap(apiClient.GET("/admin/plans")),
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePlanBody }) =>
      unwrap(apiClient.PATCH("/admin/plans/{id}", { params: { path: { id } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PLANS_QUERY_KEY })
      // O catálogo público mudou junto — sem isso, a tela de planos do cliente
      // e a vitrine continuariam mostrando o preço velho do cache até o próximo
      // refetch, e o admin veria o reajuste "não pegar".
      queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY })
    },
  })
}
