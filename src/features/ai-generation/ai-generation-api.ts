import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap, apiErrorFrom } from "@/lib/api/errors"
import { env } from "@/lib/env"

export const AI_GENERATION_JOBS_QUERY_KEY = ["ai-generation", "jobs"] as const
export const AI_GENERATION_JOB_QUERY_KEY = ["ai-generation", "job"] as const

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
