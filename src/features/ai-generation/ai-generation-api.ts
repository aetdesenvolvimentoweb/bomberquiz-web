import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap, apiErrorFrom } from "@/lib/api/errors"
import { env } from "@/lib/env"

export const AI_GENERATION_JOBS_QUERY_KEY = ["ai-generation", "jobs"] as const
export const AI_GENERATION_JOB_QUERY_KEY = ["ai-generation", "job"] as const

export interface AiGenerationJobsFilters {
  status?: string
  subjectId?: string
  page: number
  pageSize: number
}

export function useAiGenerationJobs(filters: AiGenerationJobsFilters) {
  return useQuery({
    queryKey: [...AI_GENERATION_JOBS_QUERY_KEY, filters],
    queryFn: () =>
      unwrap(
        apiClient.GET("/admin/ai-generation/jobs", {
          params: {
            query: {
              status: filters.status,
              subject_id: filters.subjectId,
              page: filters.page,
              page_size: filters.pageSize,
            },
          },
        }),
      ),
  })
}

const POLLING_STATUSES = new Set(["pending", "processing"])

// AIGEN-RF-002 CA-5: o backend recomenda poll a cada 3s enquanto pending/processing
// — primeiro uso de refetchInterval no projeto (sem precedente de polling antes
// deste módulo). Para automaticamente ao chegar em completed/failed.
export function useAiGenerationJob(jobId: string) {
  return useQuery({
    queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId],
    queryFn: () => unwrap(apiClient.GET("/admin/ai-generation/jobs/{id}", { params: { path: { id: jobId } } })),
    refetchInterval: (query) => (POLLING_STATUSES.has(query.state.data?.status ?? "") ? 3000 : false),
  })
}

// AIGEN-RF-005: editar questão gerada antes da aprovação (só permitido enquanto
// review_status === "pending", o backend retorna 409 caso contrário).
export interface UpdateGeneratedQuestionInput {
  jobId: string
  questionId: string
  values: {
    statement: string
    alternatives: string[]
    correctIndex: number
    explanation: string
    sourceReference?: string
  }
}

export function useUpdateGeneratedQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, questionId, values }: UpdateGeneratedQuestionInput) =>
      unwrap(
        apiClient.PATCH("/admin/ai-generation/jobs/{job_id}/questions/{question_id}", {
          params: { path: { job_id: jobId, question_id: questionId } },
          body: {
            statement: values.statement,
            alternatives: values.alternatives,
            correct_index: values.correctIndex,
            explanation: values.explanation,
            source_reference: values.sourceReference,
          },
        }),
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId] })
    },
  })
}

export interface GeneratedQuestionActionInput {
  jobId: string
  questionId: string
}

// AIGEN-RF-006: aprovar questão gerada individualmente — publica direto,
// sem diálogo de confirmação (mesmo fluxo de useApproveQuestion no parceiro).
export function useApproveGeneratedQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, questionId }: GeneratedQuestionActionInput) =>
      unwrap(
        apiClient.POST("/admin/ai-generation/jobs/{job_id}/questions/{question_id}/approve", {
          params: { path: { job_id: jobId, question_id: questionId } },
        }),
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId] })
    },
  })
}

// AIGEN-RF-007: descartar questão gerada individualmente, motivo opcional.
export interface DiscardGeneratedQuestionInput extends GeneratedQuestionActionInput {
  reason?: string
}

export function useDiscardGeneratedQuestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, questionId, reason }: DiscardGeneratedQuestionInput) =>
      unwrap(
        apiClient.POST("/admin/ai-generation/jobs/{job_id}/questions/{question_id}/discard", {
          params: { path: { job_id: jobId, question_id: questionId } },
          body: { reason },
        }),
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId] })
    },
  })
}

// AIGEN-RF-008: aprovar/descartar em lote todas as questões pending de um job.
export interface BatchGeneratedQuestionsInput {
  jobId: string
}

export interface BatchGeneratedQuestionsResult {
  processed: number
  approved?: number
  discarded?: number
  errors: { question_id: string; error: string }[]
}

export function useApproveAllGeneratedQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId }: BatchGeneratedQuestionsInput) =>
      unwrap(
        apiClient.POST("/admin/ai-generation/jobs/{job_id}/approve-all", {
          params: { path: { job_id: jobId } },
        }),
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId] })
    },
  })
}

export interface DiscardAllGeneratedQuestionsInput extends BatchGeneratedQuestionsInput {
  reason?: string
}

export function useDiscardAllGeneratedQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, reason }: DiscardAllGeneratedQuestionsInput) =>
      unwrap(
        apiClient.POST("/admin/ai-generation/jobs/{job_id}/discard-all", {
          params: { path: { job_id: jobId } },
          body: { reason },
        }),
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId] })
    },
  })
}

// AIGEN-RF-009: exclui o job. `confirmDiscardPending` só é necessário quando
// o job ainda tem questões pending (409 `ai_generation_job_has_pending_questions`
// na primeira tentativa sem confirmação) — ver fluxo de 2 tentativas na página.
export interface DeleteAiGenerationJobInput {
  jobId: string
  confirmDiscardPending: boolean
}

export function useDeleteAiGenerationJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ jobId, confirmDiscardPending }: DeleteAiGenerationJobInput) =>
      unwrap(
        apiClient.DELETE("/admin/ai-generation/jobs/{id}", {
          params: { path: { id: jobId } },
          body: { confirm_discard_pending: confirmDiscardPending },
        }),
      ),
    onSuccess: (_data, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: AI_GENERATION_JOBS_QUERY_KEY })
      queryClient.removeQueries({ queryKey: [...AI_GENERATION_JOB_QUERY_KEY, jobId] })
    },
  })
}

// AIGEN-RF-001: multipart (2 PDFs + subject_id + question_count) — fora do
// contrato tipado do OpenAPI (o backend registra esta rota fora de
// `.openapi()`, mesma razão do upload de imagem de pergunta). Requisição crua
// equivalente ao que o apiClient faria (mesma base URL, mesmos cookies de
// sessão) — ver imageRequest() em features/content/questions-api.ts.
export interface CreateAiGenerationJobInput {
  subjectId: string
  questionCount: number
  referencePdf: File
  materialPdf: File
}

export interface CreateAiGenerationJobResult {
  job_id: string
  status: "pending" | "processing" | "completed" | "failed"
  queue_position: number
  estimated_wait_seconds: number
}

async function createAiGenerationJobRequest(input: CreateAiGenerationJobInput): Promise<CreateAiGenerationJobResult> {
  const form = new FormData()
  form.append("subject_id", input.subjectId)
  form.append("question_count", String(input.questionCount))
  form.append("reference_pdf", input.referencePdf)
  form.append("material_pdf", input.materialPdf)

  const res = await fetch(`${env.API_BASE_URL}/admin/ai-generation/jobs`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw apiErrorFrom(res.status, json)
  return json as CreateAiGenerationJobResult
}

export function useCreateAiGenerationJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAiGenerationJobRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AI_GENERATION_JOBS_QUERY_KEY })
    },
  })
}
