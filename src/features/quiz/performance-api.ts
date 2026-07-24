import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"
import type { ResetPerformanceStatsFormValues } from "./schemas"

export type PerformanceResponse = paths["/me/performance"]["get"]["responses"][200]["content"]["application/json"]
export type PerformanceTimelineResponse = paths["/me/performance/timeline"]["get"]["responses"][200]["content"]["application/json"]

export interface QuizHistoryFilters {
  mode?: "tap_simulation" | "free_subject" | "free_axis"
  status?: string
  startedFrom?: string
  startedTo?: string
  page: number
  pageSize: number
}

const PERFORMANCE_QUERY_KEY = ["quiz", "performance"] as const
const TIMELINE_QUERY_KEY = ["quiz", "performance-timeline"] as const

export function useQuizHistory(filters: QuizHistoryFilters) {
  return useQuery({
    queryKey: ["quiz", "history", filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/me/quizzes", {
          params: {
            query: {
              mode: filters.mode,
              status: filters.status,
              started_from: filters.startedFrom,
              started_to: filters.startedTo,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

export function usePerformance() {
  return useQuery({
    queryKey: PERFORMANCE_QUERY_KEY,
    queryFn: () => unwrap(apiClient.GET("/me/performance")),
  })
}

export function usePerformanceTimeline(months: number) {
  return useQuery({
    queryKey: [...TIMELINE_QUERY_KEY, months],
    queryFn: () => unwrap(apiClient.GET("/me/performance/timeline", { params: { query: { months } } })),
  })
}

export function useResetPerformanceStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ResetPerformanceStatsFormValues) =>
      unwrap(apiClient.POST("/me/performance/reset", { body: { password: values.password, confirm: values.confirm } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TIMELINE_QUERY_KEY })
    },
  })
}
