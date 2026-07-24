import { useMutation, useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"
import type { StartQuizFormValues } from "./schemas"

export type StartQuizResponse = paths["/quizzes"]["post"]["responses"][201]["content"]["application/json"]
export type SubmitAnswerResponse = paths["/quizzes/{id}/answers"]["post"]["responses"][200]["content"]["application/json"]
export type QuizResultResponse = paths["/quizzes/{id}/result"]["get"]["responses"][200]["content"]["application/json"]

function toStartBody(values: StartQuizFormValues) {
  return {
    mode: values.mode,
    subject_id: values.subjectId || undefined,
    axis_id: values.axisId || undefined,
    size: values.size,
    timer_enabled: values.timerEnabled,
    time_per_question_seconds: values.timerEnabled ? values.timePerQuestionSeconds : undefined,
    explanation_mode: values.explanationMode,
  }
}

export function useStartQuiz() {
  return useMutation({
    mutationFn: (values: StartQuizFormValues) => unwrap(apiClient.POST("/quizzes", { body: toStartBody(values) })),
  })
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: ({ quizId, position, submittedIndex }: { quizId: string; position: number; submittedIndex: number }) =>
      unwrap(
        apiClient.POST("/quizzes/{id}/answers", {
          params: { path: { id: quizId } },
          body: { position, submitted_index: submittedIndex },
        }),
      ),
  })
}

export function useFinishQuiz() {
  return useMutation({
    mutationFn: (quizId: string) => unwrap(apiClient.POST("/quizzes/{id}/finish", { params: { path: { id: quizId } } })),
  })
}

export function useQuizResult(quizId: string, initialData?: Awaited<ReturnType<typeof fetchQuizResult>>) {
  return useQuery({
    queryKey: ["quiz", "result", quizId],
    queryFn: () => fetchQuizResult(quizId),
    initialData,
  })
}

function fetchQuizResult(quizId: string) {
  return unwrap(apiClient.GET("/quizzes/{id}/result", { params: { path: { id: quizId } } }))
}
