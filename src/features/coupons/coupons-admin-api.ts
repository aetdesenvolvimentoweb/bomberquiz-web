import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type CouponsPage = paths["/admin/coupons"]["get"]["responses"][200]["content"]["application/json"]
export type AdminCoupon = CouponsPage["items"][number]
export type CreateCouponBody = NonNullable<paths["/admin/coupons"]["post"]["requestBody"]>["content"]["application/json"]
export type UpdateCouponBody = NonNullable<
  paths["/admin/coupons/{id}"]["patch"]["requestBody"]
>["content"]["application/json"]

export interface AdminCouponsFilters {
  active: "all" | "active" | "inactive"
  onlyValidNow: boolean
  page: number
  pageSize: number
}

const ADMIN_COUPONS_QUERY_KEY = ["coupons", "admin-coupons"] as const
// Mesmo prefixo de financial-api.ts: o painel mostra os descontos dados.
const FINANCIAL_OVERVIEW_QUERY_KEY = ["subscription", "financial-overview"] as const

// SUB-RF-013 CA-4.
export function useAdminCoupons(filters: AdminCouponsFilters) {
  return useQuery({
    queryKey: [...ADMIN_COUPONS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/coupons", {
          params: {
            query: {
              is_active: filters.active === "all" ? undefined : filters.active === "active" ? "true" : "false",
              valid_at: filters.onlyValidNow ? "now" : undefined,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

function useInvalidateCoupons() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_COUPONS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: FINANCIAL_OVERVIEW_QUERY_KEY }),
    ])
}

// SUB-RF-013 CA-1 a CA-3.
export function useCreateCoupon() {
  const invalidate = useInvalidateCoupons()
  return useMutation({
    mutationFn: (body: CreateCouponBody) => unwrap(apiClient.POST("/admin/coupons", { body })),
    onSuccess: invalidate,
  })
}

// SUB-RF-013 CA-5/CA-6.
export function useUpdateCoupon() {
  const invalidate = useInvalidateCoupons()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateCouponBody & { id: string }) =>
      unwrap(apiClient.PATCH("/admin/coupons/{id}", { params: { path: { id } }, body })),
    onSuccess: invalidate,
  })
}
