import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap, apiErrorFrom } from "@/lib/api/errors"
import { env } from "@/lib/env"
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

/** Detalhe completo (não o preview de useOwnQuestions) — usado antes de abrir o diálogo de edição (PART-RF-003). */
export function fetchOwnQuestion(id: string) {
  return unwrap(apiClient.GET("/me/questions/{id}", { params: { path: { id } } }))
}

export function useUpdateOwnQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: PartnerQuestionFormValues }) =>
      unwrap(apiClient.PATCH("/me/questions/{id}", { params: { path: { id } }, body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWN_QUESTIONS_QUERY_KEY })
    },
  })
}

export function useSubmitOwnQuestionForReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.POST("/me/questions/{id}/submit", { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWN_QUESTIONS_QUERY_KEY })
    },
  })
}

// PART-RF-005 — exclusão hard-delete de rascunho próprio.
export function useDeleteOwnDraftQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.DELETE("/me/questions/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWN_QUESTIONS_QUERY_KEY })
    },
  })
}

// PART-RF-006 — upload/exclusão de imagem própria (multipart). Mesmo padrão de
// features/content/questions-api.ts (admin): fora do contrato tipado do
// openapi-fetch, o backend registra essas duas rotas fora de `.openapi()`.
async function imageRequest(method: "POST" | "DELETE", questionId: string, body?: FormData) {
  const res = await fetch(`${env.API_BASE_URL}/me/questions/${questionId}/image`, {
    method,
    credentials: "include",
    body,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw apiErrorFrom(res.status, json)
  return json
}

export function useUploadOwnQuestionImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append("file", file)
      return imageRequest("POST", id, form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWN_QUESTIONS_QUERY_KEY })
    },
  })
}

export function useDeleteOwnQuestionImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => imageRequest("DELETE", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWN_QUESTIONS_QUERY_KEY })
    },
  })
}
