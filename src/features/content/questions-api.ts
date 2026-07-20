import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap, apiErrorFrom } from "@/lib/api/errors"
import { env } from "@/lib/env"
import type { QuestionFormValues } from "./schemas"

export type QuestionStatusFilter = "draft" | "pending_review" | "published" | "archived" | "all"

export interface QuestionsFilters {
  subjectId?: string
  axisId?: string
  status: QuestionStatusFilter
  q?: string
  page: number
  pageSize: number
}

const QUESTIONS_QUERY_KEY = ["content", "questions"] as const
const PENDING_QUESTIONS_QUERY_KEY = ["content", "questions", "pending"] as const

export interface PendingQuestionsFilters {
  authorId?: string
  page: number
  pageSize: number
}

function toBody(values: QuestionFormValues) {
  return {
    subject_id: values.subjectId,
    statement: values.statement,
    alternatives: values.alternatives,
    correct_index: values.correctIndex,
    explanation: values.explanation,
    source_reference: values.sourceReference,
  }
}

export function useQuestions(filters: QuestionsFilters) {
  return useQuery({
    queryKey: [...QUESTIONS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/questions", {
          params: {
            query: {
              subject_id: filters.subjectId,
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

/** Busca o detalhe completo de uma pergunta (CONT-RF-009 CA-5) — usado antes de abrir o diálogo de edição. */
export function fetchQuestion(id: string) {
  return unwrap(apiClient.GET("/admin/questions/{id}", { params: { path: { id } } }))
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ values, asDraft }: { values: QuestionFormValues; asDraft: boolean }) =>
      unwrap(
        apiClient.POST("/admin/questions", {
          params: { query: { as_draft: asDraft ? "true" : "false" } },
          body: toBody(values),
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
      // Publicar/criar pergunta também afeta o questions_count exibido na tela de matérias.
      queryClient.invalidateQueries({ queryKey: ["content", "subjects"] })
    },
  })
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: QuestionFormValues }) =>
      unwrap(apiClient.PATCH("/admin/questions/{id}", { params: { path: { id } }, body: toBody(values) })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["content", "subjects"] })
    },
  })
}

export function useArchiveQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.POST("/admin/questions/{id}/archive", { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["content", "subjects"] })
    },
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => unwrap(apiClient.DELETE("/admin/questions/{id}", { params: { path: { id } } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ["content", "subjects"] })
    },
  })
}

// ─── Fila de revisão de parceiro (CONT-RF-014 a 016) ──────────────────────────

export function usePendingQuestions(filters: PendingQuestionsFilters) {
  return useQuery({
    queryKey: [...PENDING_QUESTIONS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/questions/pending", {
          params: { query: { author_id: filters.authorId, page: filters.page, page_size: filters.pageSize } },
        }),
      ),
  })
}

function invalidateQuestionQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: PENDING_QUESTIONS_QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: ["content", "subjects"] })
}

export function useApproveQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      unwrap(apiClient.POST("/admin/questions/{id}/approve", { params: { path: { id } }, body: { notes } })),
    onSuccess: () => invalidateQuestionQueries(queryClient),
  })
}

export function useRejectQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      unwrap(apiClient.POST("/admin/questions/{id}/reject", { params: { path: { id } }, body: { reason } })),
    onSuccess: () => invalidateQuestionQueries(queryClient),
  })
}

// Upload/delete de imagem (CONT-RF-013) usam multipart — fora do contrato tipado
// do OpenAPI (o backend regista essas duas rotas fora de `.openapi()`, ver
// api/src/http/routes/admin-questions.routes.ts). Requisição crua equivalente
// ao que apiClient faria (mesma base URL, mesmos cookies de sessão).
async function imageRequest(method: "POST" | "DELETE", questionId: string, body?: FormData) {
  const res = await fetch(`${env.API_BASE_URL}/admin/questions/${questionId}/image`, {
    method,
    credentials: "include",
    body,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw apiErrorFrom(res.status, json)
  return json
}

export function useUploadQuestionImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const form = new FormData()
      form.append("file", file)
      return imageRequest("POST", id, form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
    },
  })
}

export function useDeleteQuestionImage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => imageRequest("DELETE", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUESTIONS_QUERY_KEY })
    },
  })
}
