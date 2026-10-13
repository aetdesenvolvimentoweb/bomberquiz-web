import { describe, expect, it } from "vitest"
import { endOfDayInBrasilia, formatDateWithTime, startOfDayInBrasilia, toDateInputInBrasilia } from "@/lib/dates"

describe("formatDateWithTime", () => {
  it("mostra data e hora de Brasília, sem minutos quando é hora cheia", () => {
    expect(formatDateWithTime("2026-10-20T17:00:00.000Z")).toBe("20/10/2026 às 14h")
  })

  it("mostra os minutos quando não é hora cheia", () => {
    expect(formatDateWithTime("2026-10-20T17:05:00.000Z")).toBe("20/10/2026 às 14h05")
  })

  it("usa o dia de Brasília, não o UTC, perto da meia-noite", () => {
    expect(formatDateWithTime("2026-10-21T01:30:00.000Z")).toBe("20/10/2026 às 22h30")
  })
})

describe("dias inteiros em Brasília (validade de cupom)", () => {
  it("início e fim do dia no fuso de Brasília", () => {
    expect(new Date(startOfDayInBrasilia("2026-10-31")).toISOString()).toBe("2026-10-31T03:00:00.000Z")
    expect(new Date(endOfDayInBrasilia("2026-10-31")).toISOString()).toBe("2026-11-01T02:59:59.999Z")
  })

  it("volta para o dia de Brasília, mesmo quando em UTC já é o dia seguinte", () => {
    expect(toDateInputInBrasilia("2026-11-01T02:59:59.999Z")).toBe("2026-10-31")
  })
})
