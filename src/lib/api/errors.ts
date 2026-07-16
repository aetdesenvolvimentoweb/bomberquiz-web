import { z } from "zod"

const ErrorFieldSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
})

const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    fields: z.array(ErrorFieldSchema).optional(),
    request_id: z.string(),
  }),
})

export type ApiErrorField = z.infer<typeof ErrorFieldSchema>
type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>

/** Erro tipado a partir do envelope padrão da API (ver arquitetura.md § Formato padronizado de resposta de erro). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>
  readonly fields?: ApiErrorField[]
  readonly requestId?: string

  constructor(status: number, body: ErrorEnvelope | null) {
    super(body?.error.message ?? "Erro inesperado. Tente novamente.")
    this.status = status
    this.code = body?.error.code ?? "unknown_error"
    this.details = body?.error.details
    this.fields = body?.error.fields
    this.requestId = body?.error.request_id
  }
}

/**
 * Constrói ApiError a partir do `error` já parseado pelo openapi-fetch. Precisa
 * receber o `error` (não o `response` bruto): o openapi-fetch lê o corpo da
 * resposta internamente para popular `data`/`error`, então `response.clone()`
 * depois disso falha com "Response body is already used" — não há como reler o
 * corpo aqui.
 */
export function apiErrorFrom(status: number, error: unknown): ApiError {
  const result = ErrorEnvelopeSchema.safeParse(error)
  return new ApiError(status, result.success ? result.data : null)
}

/** Extrai `data` de uma chamada openapi-fetch, lançando ApiError em caso de falha. */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call
  if (error !== undefined) throw apiErrorFrom(response.status, error)
  return data as T
}
