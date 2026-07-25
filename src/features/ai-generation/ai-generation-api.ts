import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap, apiErrorFrom } from "@/lib/api/errors"
import { env } from "@/lib/env"

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
