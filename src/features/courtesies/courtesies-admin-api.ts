import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type CourtesiesPage =
  paths["/admin/courtesies"]["get"]["responses"][200]["content"]["application/json"]
export type AdminCourtesy = CourtesiesPage["items"][number]
export type CourtesyCategory = AdminCourtesy["category"]
export type CourtesyStatusFilter = AdminCourtesy["status"] | "all"
export type CourtesyCategoryFilter = CourtesyCategory | "all"

export interface AdminCourtesiesFilters {
  category: CourtesyCategoryFilter
  status: CourtesyStatusFilter
  includeRevoked: boolean
  page: number
  pageSize: number
}

const ADMIN_COURTESIES_QUERY_KEY = ["courtesies", "admin-courtesies"] as const
// Mesmo prefixo de financial-api.ts: conceder/revogar muda os blocos de cortesia do painel.
const FINANCIAL_OVERVIEW_QUERY_KEY = ["subscription", "financial-overview"] as const
// Prefixo de users-admin-api.ts: o detalhe de usuário (PROF-RF-014) mostra as cortesias.
const ADMIN_USERS_QUERY_KEY = ["users", "admin-users"] as const

// SUB-RF-009: histórico de cortesias + saldo do limite mensal de quem consulta.
export function useAdminCourtesies(filters: AdminCourtesiesFilters) {
  return useQuery({
    queryKey: [...ADMIN_COURTESIES_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/courtesies", {
          params: {
            query: {
              category: filters.category === "all" ? undefined : filters.category,
              status: filters.status === "all" ? undefined : filters.status,
              include_revoked: filters.includeRevoked ? "true" : undefined,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

function useInvalidateCourtesies() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_COURTESIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: FINANCIAL_OVERVIEW_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
    ])
}

// SUB-RF-008.
export function useGrantCourtesy() {
  const invalidate = useInvalidateCourtesies()
  return useMutation({
    mutationFn: (body: { beneficiary_user_id: string; days_granted: number; category: CourtesyCategory; notes?: string }) =>
      unwrap(apiClient.POST("/admin/courtesies", { body })),
    onSuccess: invalidate,
  })
}

// SUB-RF-010.
export function useRevokeCourtesy() {
  const invalidate = useInvalidateCourtesies()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      unwrap(apiClient.POST("/admin/courtesies/{id}/revoke", { params: { path: { id } }, body: { reason } })),
    onSuccess: invalidate,
  })
}
