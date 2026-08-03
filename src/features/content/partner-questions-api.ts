import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { PartnerQuestionFormValues } from "./schemas"

// PART-RF-001 a 008 — área do parceiro (/me/questions, /me/partner/dashboard).
// Espelha a estrutura de features/content/questions-api.ts (admin), mas sobre o
// contrato próprio do parceiro: sem author_id/source no corpo (sempre self/manual).

export type OwnQuestionStatusFilter = "all" | "draft" | "pending_review" | "published" | "archived"

const OWN_QUESTIONS_QUERY_KEY = ["content", "own-questions"] as const

const ALL_STATUSES = "draft,pending_review,published,archived"

function statusParam(filter: OwnQuestionStatusFilter): string | undefined {
  return filter === "all" ? ALL_STATUSES : filter
}

export interface OwnQuestionsFilters {
  subjectId?: string
  status: OwnQuestionStatusFilter
  q?: string
  page: number
  pageSize: number
}

function toBody(values: PartnerQuestionFormValues) {
  return {
    subject_id: values.subjectId,
    statement: values.statement,
    alternatives: values.alternatives,
    correct_index: values.correctIndex,
    explanation: values.explanation,
    source_reference: values.sourceReference,
  }
}

export function useOwnQuestions(filters: OwnQuestionsFilters) {
  return useQuery({
    queryKey: [...OWN_QUESTIONS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/me/questions", {
          params: {
            query: {
              subject_id: filters.subjectId,
              status: statusParam(filters.status),
              q: filters.q,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

export function useCreateOwnQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: PartnerQuestionFormValues) => unwrap(apiClient.POST("/me/questions", { body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWN_QUESTIONS_QUERY_KEY })
    },
  })
}
