import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppLayout } from "@/components/app-layout"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

const clientUser = {
  id: "user-1",
  name: "Ana Souza",
  email: "ana@example.com",
  role: "client" as const,
}

function renderAppLayout(user: { role: string } & Record<string, unknown> = clientUser) {
  mockedApiClient.GET.mockResolvedValue({
    data: { user, requires_consent_renewal: false },
    error: undefined,
    response: new Response(null, { status: 200 }),
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/quiz/iniciar"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/quiz/iniciar" element={<div>Conteúdo do Quiz</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
})

describe("AppLayout", () => {
  it("mantém na nav principal apenas os destinos de conteúdo", async () => {
    renderAppLayout()

    expect(await screen.findByText("Conteúdo do Quiz")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Quiz" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Histórico" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Desempenho" }).length).toBeGreaterThan(0)
  })

  // "Assinatura" saiu da nav principal em 2026-08-28: é assunto de conta, e
  // disputava espaço com Quiz/Histórico/Desempenho. Se voltar para lá, este
  // teste quebra antes de a nav ficar lotada de novo.
  it("não expõe Assinatura na nav principal — o lugar dela é o menu do perfil", async () => {
    renderAppLayout()

    await screen.findByText("Conteúdo do Quiz")
    expect(screen.queryByRole("link", { name: "Assinatura" })).not.toBeInTheDocument()
  })

  it("abre Assinatura pelo menu do perfil", async () => {
    renderAppLayout()
    const user = userEvent.setup()

    await screen.findByText("Conteúdo do Quiz")
    await user.click(await screen.findByRole("button", { name: "Conta de Ana Souza" }))

    const item = await screen.findByRole("menuitem", { name: "Assinatura" })
    expect(item).toHaveAttribute("href", "/assinatura")
  })

  // Abaixo de `md` o menu do perfil não existe — é o drawer que carrega o bloco
  // da conta. Sem esta entrada, quem usa o app pelo celular (a maioria, é PWA)
  // perderia o acesso à assinatura junto com a saída dela da nav.
  it("mantém Assinatura acessível no drawer mobile", async () => {
    renderAppLayout()
    const user = userEvent.setup()

    await screen.findByText("Conteúdo do Quiz")
    await user.click(screen.getByRole("button", { name: "Abrir menu" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("link", { name: "Assinatura" })).toHaveAttribute("href", "/assinatura")
  })

  it("mostra o painel administrativo só para admin", async () => {
    renderAppLayout({ ...clientUser, role: "admin" })

    // `findAll`, não `getAll`: o link depende do `role` que chega em GET /me,
    // então ele só aparece no re-render seguinte à resposta da sessão.
    expect(await screen.findAllByRole("link", { name: "Painel administrativo" })).not.toHaveLength(0)
  })
})
