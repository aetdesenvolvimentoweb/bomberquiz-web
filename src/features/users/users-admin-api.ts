import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type AdminUser =
  paths["/admin/users"]["get"]["responses"][200]["content"]["application/json"]["items"][number]
export type UserRoleFilter = AdminUser["role"] | "all"
export type UserStatusFilter = AdminUser["status"] | "all"

export interface AdminUsersFilters {
  email?: string
  name?: string
  role: UserRoleFilter
  status: UserStatusFilter
  page: number
  pageSize: number
}

const ADMIN_USERS_QUERY_KEY = ["users", "admin-users"] as const

// PROF-RF-011: busca de usuários para promover/revogar parceiro.
export function useAdminUsers(filters: AdminUsersFilters, options: { enabled?: boolean } = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryKey: [...ADMIN_USERS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/users", {
          params: {
            query: {
              email: filters.email,
              name: filters.name,
              role: filters.role === "all" ? undefined : filters.role,
              status: filters.status === "all" ? undefined : filters.status,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

// PROF-RF-012/013: `partner` promove, `client` revoga.
export function useChangeUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, role, reason }: { id: string; role: "partner" | "client"; reason?: string }) =>
      unwrap(apiClient.PATCH("/admin/users/{id}/role", { params: { path: { id } }, body: { role, reason } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  })
}
