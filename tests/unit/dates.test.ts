import { describe, expect, it } from "vitest"
import { formatDateWithTime } from "@/lib/dates"

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
