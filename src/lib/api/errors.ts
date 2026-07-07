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

async function parseErrorBody(response: Response): Promise<ErrorEnvelope | null> {
  try {
    const json = await response.clone().json()
    const result = ErrorEnvelopeSchema.safeParse(json)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/** Lança ApiError se a resposta não for OK. Usar sempre com o `response` bruto devolvido pelo cliente openapi-fetch. */
export async function throwIfError(response: Response): Promise<void> {
  if (response.ok) return
  const body = await parseErrorBody(response)
  throw new ApiError(response.status, body)
}

/** Extrai `data` de uma chamada openapi-fetch, lançando ApiError em caso de falha. */
export async function unwrap<T>(
  call: Promise<{ data?: T; response: Response }>,
): Promise<T> {
  const { data, response } = await call
  await throwIfError(response)
  return data as T
}
