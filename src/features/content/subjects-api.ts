import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { SubjectFormValues } from "./schemas"

export type SubjectStatusFilter = "active" | "archived" | "all"

export interface SubjectsFilters {
  axisId?: string
  status: SubjectStatusFilter
  q?: string
  page: number
  pageSize: number
}

const SUBJECTS_QUERY_KEY = ["content", "subjects"] as const

function toBody(values: SubjectFormValues) {
  return {
    axis_id: values.axisId,
    name: values.name,
    official_source: values.officialSource,
  }
}

export function useSubjects(filters: SubjectsFilters) {
  return useQuery({
    queryKey: [...SUBJECTS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/subjects", {
          params: {
            query: {
              axis_id: filters.axisId,
              status: filters.status,
              q: filters.q,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: SubjectFormValues) => unwrap(apiClient.POST("/admin/subjects", { body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
      // Mover/criar matéria também afeta o subjects_count exibido na tela de eixos.
      queryClient.invalidateQueries({ queryKey: ["content", "axes"] })
    },
  })
}

export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: SubjectFormValues }) =>
      unwrap(apiClient.PATCH("/admin/subjects/{id}", { params: { path: { id } }, body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["content", "axes"] })
    },
  })
}

export function useArchiveSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.POST("/admin/subjects/{id}/archive", { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["content", "axes"] })
    },
  })
}
