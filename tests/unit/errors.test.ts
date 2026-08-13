import { describe, expect, it } from "vitest"
import { ApiError, unwrap } from "@/lib/api/errors"

describe("unwrap", () => {
  it("lança ApiError para resposta não-2xx com `error` populado", async () => {
    const call = Promise.resolve({
      data: undefined,
      error: { error: { code: "invalid_credentials", message: "E-mail ou senha incorretos.", request_id: "req_1" } },
      response: new Response(null, { status: 401 }),
    })

    await expect(unwrap(call)).rejects.toThrow(ApiError)
    await expect(unwrap(call)).rejects.toMatchObject({ status: 401, code: "invalid_credentials" })
  })

  it("lança ApiError para resposta não-2xx com corpo vazio (regressão: openapi-fetch não popula `error` para Content-Length: 0)", async () => {
    const call = Promise.resolve({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 401 }),
    })

    await expect(unwrap(call)).rejects.toThrow(ApiError)
  })

  it("resolve com undefined para resposta 2xx sem corpo (ex.: 204 legítimo)", async () => {
    const call = Promise.resolve({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    })

    await expect(unwrap(call)).resolves.toBeUndefined()
  })

  it("resolve com os dados para resposta 2xx com corpo", async () => {
    const call = Promise.resolve({
      data: { ok: true },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    await expect(unwrap(call)).resolves.toEqual({ ok: true })
  })

  it("mapeia 502 do proxy (corpo HTML, sem envelope) para server_unavailable com mensagem amigável", async () => {
    // Quando a VM da API morre/reinicia, o proxy do Fly responde 502 com uma
    // página HTML — o envelope JSON nunca existe nesse caso.
    const call = Promise.resolve({
      data: undefined,
      error: "<html><body>Bad Gateway</body></html>" as unknown,
      response: new Response(null, { status: 502 }),
    })

    await expect(unwrap(call)).rejects.toMatchObject({
      status: 502,
      code: "server_unavailable",
      message: "Servidor indisponível no momento. Tente novamente em instantes.",
    })
  })

  it.each([503, 504])("mapeia %i sem envelope para server_unavailable", async (status) => {
    const call = Promise.resolve({
      data: undefined,
      error: undefined,
      response: new Response(null, { status }),
    })

    await expect(unwrap(call)).rejects.toMatchObject({ status, code: "server_unavailable" })
  })

  it("preserva o envelope da API quando o 503 vem com corpo JSON (ex.: server_busy do backpressure)", async () => {
    const call = Promise.resolve({
      data: undefined,
      error: { error: { code: "server_busy", message: "Servidor ocupado no momento. Tente novamente em instantes.", request_id: "req_2" } },
      response: new Response(null, { status: 503 }),
    })

    await expect(unwrap(call)).rejects.toMatchObject({ status: 503, code: "server_busy" })
  })

  it("converte falha de rede (fetch rejeitado, sem Response) em network_error amigável", async () => {
    // fetch lança TypeError quando a conexão é recusada — o caso da VM
    // reiniciando ou do usuário offline.
    const call = Promise.reject(new TypeError("Failed to fetch")) as Promise<{
      data?: unknown
      error?: unknown
      response: Response
    }>

    await expect(unwrap(call)).rejects.toMatchObject({
      status: 0,
      code: "network_error",
      message: "Servidor indisponível no momento. Tente novamente em instantes.",
    })
  })
})
