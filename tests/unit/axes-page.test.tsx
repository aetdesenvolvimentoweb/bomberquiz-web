import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AxesPage } from "@/pages/admin/axes-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// O tipo real de apiClient.GET/POST (openapi-fetch) é genérico demais para o
// TypeScript inferir um `mockResolvedValue` útil sem especificar o path a cada
// chamada — cast para Mock solto, igual ao padrão usado nos demais testes de
// página que mockam rede.
const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

function renderAxesPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/eixos"]}>
        <AxesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const axisA = {
  id: "axis-1",
  name: "Salvamento",
  description: "Eixo de salvamento",
  status: "active" as const,
  subjects_count: 2,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
})

describe("AxesPage", () => {
  it("lista os eixos retornados pela API", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [axisA], page: 1, page_size: 20, total: 1 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderAxesPage()

    expect(await screen.findByText("Salvamento")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("cria um novo eixo pelo diálogo", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [], page: 1, page_size: 20, total: 0 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    mockedApiClient.POST.mockResolvedValue({
      data: axisA,
      error: undefined,
      response: new Response(null, { status: 201 }),
    })

    renderAxesPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhum eixo encontrado.")
    await user.click(screen.getByRole("button", { name: "Novo eixo" }))

    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Nome"), "Salvamento")
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(apiClient.POST).toHaveBeenCalledWith(
      "/admin/axes",
      expect.objectContaining({ body: expect.objectContaining({ name: "Salvamento" }) }),
    ))
  })

  it("mostra erro inline quando o nome já está em uso (409)", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [], page: 1, page_size: 20, total: 0 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    mockedApiClient.POST.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "axis_name_in_use",
          message: "Já existe um eixo temático com este nome",
          request_id: "req_test",
        },
      },
      response: new Response(null, { status: 409 }),
    })

    renderAxesPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhum eixo encontrado.")
    await user.click(screen.getByRole("button", { name: "Novo eixo" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Nome"), "Salvamento")
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Já existe um eixo temático com este nome"),
    )
  })

  it("alterna o rótulo do botão ao desativar/reativar um eixo", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [axisA], page: 1, page_size: 20, total: 1 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    mockedApiClient.POST.mockResolvedValue({
      data: { ...axisA, status: "archived", archived_at: "2026-01-02T00:00:00.000Z" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderAxesPage()
    const user = userEvent.setup()

    await screen.findByText("Salvamento")
    await user.click(screen.getByRole("button", { name: "Desativar eixo" }))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/admin/axes/{id}/archive",
        expect.objectContaining({ params: { path: { id: axisA.id } } }),
      ),
    )
  })
})
