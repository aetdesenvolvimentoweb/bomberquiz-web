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
})
