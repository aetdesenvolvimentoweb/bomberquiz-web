import { describe, expect, it } from "vitest"
import { extractDigits, formatPhoneDisplay, validateBrazilianPhone } from "@/lib/phone"

describe("validateBrazilianPhone", () => {
  it("aceita celular válido (DDD real + 9 após o DDD)", () => {
    expect(validateBrazilianPhone("62999998888")).toEqual({ valid: true, type: "mobile" })
  })

  it("aceita fixo válido (DDD real + dígito 2-5 após o DDD)", () => {
    expect(validateBrazilianPhone("6233334444")).toEqual({ valid: true, type: "landline" })
  })

  it("rejeita DDD inexistente (borda: DDD nunca atribuído pela Anatel)", () => {
    const result = validateBrazilianPhone("20999998888")
    expect(result.valid).toBe(false)
    expect((result as { reason: string }).reason).toBe("DDD inválido")
  })

  it("rejeita número de 11 dígitos que não começa com 9 após o DDD (borda: 'celular' malformado)", () => {
    const result = validateBrazilianPhone("62899998888")
    expect(result.valid).toBe(false)
    expect((result as { reason: string }).reason).toBe("Número de celular deve começar com 9 após o DDD")
  })

  it("rejeita número de 10 dígitos começando com 9 (borda: formato de celular com um dígito a menos)", () => {
    const result = validateBrazilianPhone("6299998888")
    expect(result.valid).toBe(false)
    expect((result as { reason: string }).reason).toBe("Número fixo inválido")
  })

  it("rejeita tamanho errado (borda)", () => {
    expect(validateBrazilianPhone("629999888").valid).toBe(false)
    expect(validateBrazilianPhone("556299998888").valid).toBe(false)
  })
})

describe("extractDigits", () => {
  it("remove parênteses, espaço e traço da máscara", () => {
    expect(extractDigits("(62) 99999-8888")).toBe("62999998888")
  })

  it("mantém string vazia quando não há dígitos", () => {
    expect(extractDigits("()  -")).toBe("")
  })
})

describe("formatPhoneDisplay", () => {
  it("formata progressivamente enquanto o usuário digita", () => {
    expect(formatPhoneDisplay("6")).toBe("(6")
    expect(formatPhoneDisplay("62")).toBe("(62")
    expect(formatPhoneDisplay("629")).toBe("(62) 9")
  })

  it("formata celular completo com 5 dígitos antes do traço", () => {
    expect(formatPhoneDisplay("62999998888")).toBe("(62) 99999-8888")
  })

  it("formata fixo completo com 4 dígitos antes do traço", () => {
    expect(formatPhoneDisplay("6233334444")).toBe("(62) 3333-4444")
  })

  it("retorna string vazia para entrada vazia", () => {
    expect(formatPhoneDisplay("")).toBe("")
  })
})
