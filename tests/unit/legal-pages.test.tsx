import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { PrivacyPage } from "@/pages/legal/privacy-page"
import { TermsPage } from "@/pages/legal/terms-page"
import { CONSENT_VERSION } from "@/content/legal/consent-version"
import privacyMarkdown from "@/content/legal/privacidade-v2.md?raw"
import termsMarkdown from "@/content/legal/termos-v2.md?raw"

describe("Termos e Política (AUTH-RF-011 CA-4)", () => {
  it("a Política mostra o controlador, o contato e a tabela de fornecedores", () => {
    // Arrange & Act
    render(<PrivacyPage />, { wrapper: MemoryRouter })

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeInTheDocument()
    expect(screen.getAllByText(/André David dos Santos/).length).toBeGreaterThan(0)
    expect(screen.getAllByText("suporte@bomberquiz.com.br").length).toBeGreaterThan(0)
    expect(screen.getByRole("cell", { name: "Mercado Pago" })).toBeInTheDocument()
  })

  it("os Termos levam à Política pelo router", () => {
    // Arrange & Act
    render(<TermsPage />, { wrapper: MemoryRouter })

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Termos de Uso" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Política de Privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  it("a versão no texto é a mesma que o cadastro registra", () => {
    const version = `**Versão ${CONSENT_VERSION} ·`
    expect(privacyMarkdown).toContain(version)
    expect(termsMarkdown).toContain(version)
  })
})
