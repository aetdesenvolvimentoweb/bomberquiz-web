import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type QuestionReportReason = NonNullable<
  paths["/quizzes/{id}/questions/{position}/report"]["post"]["requestBody"]
>["content"]["application/json"]["reason"]
export type ReportedQuestionsPage =
  paths["/admin/question-reports"]["get"]["responses"][200]["content"]["application/json"]
export type ReportedQuestion = ReportedQuestionsPage["items"][number]
export type QuestionReportResolution = "corrected" | "dismissed"

export const QUESTION_REPORT_REASON_LABELS: Record<QuestionReportReason, string> = {
  statement: "Enunciado",
  answer_key: "Gabarito",
  explanation: "Explicação",
  other: "Outro",
}

const ADMIN_QUESTION_REPORTS_QUERY_KEY = ["quiz", "admin-question-reports"] as const

// QUIZ-RF-011: contestação feita pelo cliente, no quiz ou na revisão do resultado.
export function useReportQuestion() {
  return useMutation({
    mutationFn: ({
      quizId,
      position,
      reason,
      message,
    }: {
      quizId: string
      position: number
      reason: QuestionReportReason
      message: string
    }) =>
      unwrap(
        apiClient.POST("/quizzes/{id}/questions/{position}/report", {
          params: { path: { id: quizId, position } },
          body: { reason, message },
        }),
      ),
  })
}

// CA-7: fila do admin, por pergunta.
export function useAdminQuestionReports(status: "open" | "resolved", page: number, pageSize = 10) {
  return useQuery({
    queryKey: [...ADMIN_QUESTION_REPORTS_QUERY_KEY, status, page, pageSize],
    queryFn: () =>
      unwrap(apiClient.GET("/admin/question-reports", { params: { query: { status, page, page_size: pageSize } } })),
  })
}

/** Número de perguntas com contestação aberta — o contador do menu do painel. */
export function useOpenQuestionReportsCount() {
  const { data } = useQuery({
    queryKey: [...ADMIN_QUESTION_REPORTS_QUERY_KEY, "open", 1, 1],
    queryFn: () =>
      unwrap(apiClient.GET("/admin/question-reports", { params: { query: { status: "open", page: 1, page_size: 1 } } })),
    // Contestação chega devagar; não vale refazer a consulta a cada troca de tela.
    staleTime: 60_000,
  })
  return data?.total ?? 0
}

// CA-8.
export function useResolveQuestionReports() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, resolution, note }: { questionId: string; resolution: QuestionReportResolution; note: string }) =>
      unwrap(
        apiClient.POST("/admin/question-reports/{question_id}/resolve", {
          params: { path: { question_id: questionId } },
          body: { resolution, note },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_QUESTION_REPORTS_QUERY_KEY }),
  })
}
