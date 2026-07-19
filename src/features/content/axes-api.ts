import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { AxisFormValues } from "./schemas"

export type AxisStatusFilter = "active" | "archived" | "all"

export interface AxesFilters {
  status: AxisStatusFilter
  q?: string
  page: number
  pageSize: number
}

const AXES_QUERY_KEY = ["content", "axes"] as const

function toBody(values: AxisFormValues) {
  return {
    name: values.name,
    description: values.description,
    tap_weight: values.tapWeight,
  }
}

export function useAxes(filters: AxesFilters) {
  return useQuery({
    queryKey: [...AXES_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/axes", {
          params: { query: { status: filters.status, q: filters.q, page: filters.page, page_size: filters.pageSize } },
        }),
      ),
  })
}

export function useCreateAxis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: AxisFormValues) => unwrap(apiClient.POST("/admin/axes", { body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AXES_QUERY_KEY })
    },
  })
}

export function useUpdateAxis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: AxisFormValues }) =>
      unwrap(apiClient.PATCH("/admin/axes/{id}", { params: { path: { id } }, body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AXES_QUERY_KEY })
    },
  })
}

export function useArchiveAxis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.POST("/admin/axes/{id}/archive", { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AXES_QUERY_KEY })
    },
  })
}
