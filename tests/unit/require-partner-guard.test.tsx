import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RequirePartner } from "@/features/session/guards"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

// Ver mesmo comentário em axes-page.test.tsx sobre o tipo genérico do openapi-fetch.
const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function renderWithGuard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/parceiro/perguntas"]}>
        <Routes>
          <Route element={<RequirePartner />}>
            <Route path="/parceiro/perguntas" element={<div>Área do parceiro</div>} />
          </Route>
          <Route path="/inicio" element={<div>Início</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("RequirePartner", () => {
  it("redireciona usuário sem papel partner para /inicio", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { user: { role: "client" }, requires_consent_renewal: false },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderWithGuard()

    expect(await screen.findByText("Início")).toBeInTheDocument()
  })

  it("redireciona admin para /inicio — área do parceiro é estrita a role=partner", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { user: { role: "admin" }, requires_consent_renewal: false },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderWithGuard()

    expect(await screen.findByText("Início")).toBeInTheDocument()
  })

  it("libera acesso para usuário com papel partner", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { user: { role: "partner" }, requires_consent_renewal: false },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderWithGuard()

    expect(await screen.findByText("Área do parceiro")).toBeInTheDocument()
  })
})
