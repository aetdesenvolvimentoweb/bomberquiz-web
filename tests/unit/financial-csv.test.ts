import { describe, expect, it } from "vitest"
import { buildPaymentsCsv } from "@/features/subscription/financial-csv"
import type { AdminPayment } from "@/features/subscription/financial-api"

function buildPayment(overrides: Partial<AdminPayment> = {}): AdminPayment {
  return {
    id: "pay-1",
    user_id: "user-1",
    user_name: "João Silva",
    user_email: "joao@example.com",
    plan_slug: "monthly",
    plan_name: "Mensal",
    method: "pix",
    status: "paid",
    installments: 1,
    net_amount: 2990,
    fee_amount: 149,
    received_amount: 2841,
    mp_legacy_payment_id: "176036687788",
    created_at: "2026-04-10T15:00:00.000Z",
    paid_at: "2026-04-10T15:00:00.000Z",
    refunded_at: null,
    ...overrides,
  }
}

describe("buildPaymentsCsv", () => {
  it("usa ponto-e-vírgula e vírgula decimal, que é o que o Excel pt-BR espera", () => {
    // Act
    const csv = buildPaymentsCsv([buildPayment()])

    // Assert
    const linha = csv.split("\r\n")[1]!
    expect(linha).toContain("29,90")
    expect(linha).toContain("1,49")
    expect(linha.split(";").length).toBe(11)
  })

  it("começa com BOM, sem o qual o Excel exibe 'JoÃ£o' no lugar de 'João'", () => {
    // Act
    const csv = buildPaymentsCsv([buildPayment()])

    // Assert
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain("João Silva")
  })

  /**
   * Taxa desconhecida vira célula vazia, nunca zero: um zero entraria na soma do
   * contador como fato, inflando o líquido de um jeito que a planilha não
   * denuncia.
   */
  it("deixa a célula vazia quando a taxa ainda não é conhecida", () => {
    // Act
    const csv = buildPaymentsCsv([buildPayment({ fee_amount: null, received_amount: null })])

    // Assert
    const linha = csv.split("\r\n")[1]!
    expect(linha).not.toContain("0,00")
    expect(linha.endsWith(";;;176036687788")).toBe(true)
  })

  /**
   * Nome de cliente é texto que veio de fora. Sem neutralizar, um cadastro
   * começando com `=` seria avaliado como fórmula ao abrir a planilha.
   */
  it("neutraliza célula que começaria com fórmula", () => {
    // Act
    const csv = buildPaymentsCsv([buildPayment({ user_name: "=1+1" })])

    // Assert
    expect(csv).toContain("'=1+1")
  })

  it("escapa nome que contém o próprio separador", () => {
    // Act
    const csv = buildPaymentsCsv([buildPayment({ user_name: "Silva; João" })])

    // Assert
    expect(csv).toContain('"Silva; João"')
    // E a linha continua com o mesmo número de colunas.
    expect(csv.split("\r\n")[1]!.split('";').length).toBe(2)
  })

  it("traduz status e método para o que o admin lê na tela", () => {
    // Act
    const csv = buildPaymentsCsv([buildPayment({ status: "refunded", method: "card", installments: 3 })])

    // Assert
    expect(csv).toContain("Estornado")
    expect(csv).toContain("Cartão")
  })

  it("emite só o cabeçalho quando não há transação", () => {
    // Act
    const csv = buildPaymentsCsv([])

    // Assert
    expect(csv.split("\r\n")).toHaveLength(1)
    expect(csv).toContain("Taxa MP")
  })
})
