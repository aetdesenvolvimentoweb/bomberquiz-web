import { describe, expect, it } from "vitest"
import { getInitials } from "@/lib/initials"

describe("getInitials", () => {
  it("retorna as iniciais de nome e sobrenome", () => {
    expect(getInitials("Ana Souza")).toBe("AS")
  })

  it("lida com nome único", () => {
    expect(getInitials("Ana")).toBe("A")
  })

  it("retorna ? para string vazia", () => {
    expect(getInitials("   ")).toBe("?")
  })
})
