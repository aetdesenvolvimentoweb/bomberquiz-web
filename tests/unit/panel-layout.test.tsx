import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PanelLayout } from "@/components/panel-layout"
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

const adminUser = {
  id: "admin-1",
  name: "Ana Souza",
  email: "ana@example.com",
  role: "admin" as const,
}

function renderPanelLayout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/eixos"]}>
        <Routes>
          <Route element={<PanelLayout />}>
            <Route path="/painel/eixos" element={<div>Conteúdo de Eixos</div>} />
            <Route path="/painel/materias" element={<div>Conteúdo de Matérias</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  mockedApiClient.GET.mockResolvedValue({
    data: { user: adminUser, requires_consent_renewal: false },
    error: undefined,
    response: new Response(null, { status: 200 }),
  })
})

describe("PanelLayout", () => {
  it("renderiza a marca, os 4 links de navegação e o nome do usuário", async () => {
    renderPanelLayout()

    expect(await screen.findByText("Conteúdo de Eixos")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Eixos" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Matérias" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Perguntas" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Revisão" })).toBeInTheDocument()
    expect(await screen.findByRole("button", { name: /Ana/ })).toBeInTheDocument()
  })

  it("abre o menu mobile pelo hambúrguer e fecha ao clicar num link", async () => {
    renderPanelLayout()
    const user = userEvent.setup()

    await screen.findByText("Conteúdo de Eixos")
    await user.click(screen.getByRole("button", { name: "Abrir menu" }))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByRole("link", { name: "Matérias" })).toBeInTheDocument()

    await user.click(within(dialog).getByRole("link", { name: "Matérias" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(await screen.findByText("Conteúdo de Matérias")).toBeInTheDocument()
  })

  it("desloga pelo menu do usuário (desktop)", async () => {
    mockedApiClient.POST.mockResolvedValue({
      data: null,
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderPanelLayout()
    const user = userEvent.setup()

    await screen.findByText("Conteúdo de Eixos")
    await user.click(await screen.findByRole("button", { name: /Ana/ }))
    await user.click(await screen.findByText("Sair"))

    await waitFor(() => expect(mockedApiClient.POST).toHaveBeenCalledWith("/auth/logout"))
  })
})
