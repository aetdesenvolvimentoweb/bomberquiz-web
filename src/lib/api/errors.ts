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

const SERVER_UNAVAILABLE_MESSAGE =
  "Servidor indisponível no momento. Tente novamente em instantes."

/** Erro tipado a partir do envelope padrão da API (ver arquitetura.md § Formato padronizado de resposta de erro). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>
  readonly fields?: ApiErrorField[]
  readonly requestId?: string

  constructor(
    status: number,
    body: ErrorEnvelope | null,
    fallback?: { code: string; message: string },
  ) {
    super(body?.error.message ?? fallback?.message ?? "Erro inesperado. Tente novamente.")
    this.status = status
    this.code = body?.error.code ?? fallback?.code ?? "unknown_error"
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
  if (result.success) return new ApiError(status, result.data)
  // 502/504 vêm do proxy do Fly quando o processo da API morreu/está
  // reiniciando — o corpo é uma página HTML, não o envelope JSON. 503 sem
  // envelope idem. Sem este branch o usuário via o genérico "Erro inesperado".
  if (status === 502 || status === 503 || status === 504) {
    return new ApiError(status, null, {
      code: "server_unavailable",
      message: SERVER_UNAVAILABLE_MESSAGE,
    })
  }
  return new ApiError(status, null)
}

/**
 * Extrai `data` de uma chamada openapi-fetch, lançando ApiError em caso de
 * falha. Checa `response.ok` em vez de só `error !== undefined`: para
 * respostas não-2xx com corpo vazio (Content-Length: 0 — o caso de 401/403/429
 * do login, documentados como `content?: never` no schema), o openapi-fetch
 * devolve `{ error: undefined, response }`, então depender só de `error`
 * deixaria esse erro passar como se fosse sucesso.
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let settled: { data?: T; error?: unknown; response: Response }
  try {
    settled = await call
  } catch {
    // fetch lança TypeError em falha de rede (connection refused com a VM
    // reiniciando, offline, DNS) — nunca chega a existir um Response.
    throw new ApiError(0, null, {
      code: "network_error",
      message: SERVER_UNAVAILABLE_MESSAGE,
    })
  }
  const { data, error, response } = settled
  if (!response.ok) throw apiErrorFrom(response.status, error)
  return data as T
}
