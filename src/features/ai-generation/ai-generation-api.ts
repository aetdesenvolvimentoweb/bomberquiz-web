import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

export const AI_GENERATION_JOBS_QUERY_KEY = ["ai-generation", "jobs"] as const

export interface AiGenerationJobsFilters {
  page: number
  pageSize: number
}

export function useAiGenerationJobs(filters: AiGenerationJobsFilters) {
  return useQuery({
    queryKey: [...AI_GENERATION_JOBS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/ai-generation/jobs", {
          params: { query: { page: filters.page, page_size: filters.pageSize } },
        }),
      ),
  })
}
