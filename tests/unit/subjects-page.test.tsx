import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { SubjectsPage } from "@/pages/admin/subjects-page"
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

// Mesmo padrão de cast usado em axes-page.test.tsx: o tipo genérico de
// apiClient.GET/POST (openapi-fetch) é complexo demais para inferir
// mockResolvedValue útil sem especificar o path a cada chamada.
const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

function renderSubjectsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/materias"]}>
        <SubjectsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const axisA = {
  id: "axis-1",
  name: "Salvamento",
  description: null,
  tap_weight: 9,
  status: "active" as const,
  subjects_count: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

const subjectA = {
  id: "subject-1",
  axis_id: "axis-1",
  axis_name: "Salvamento",
  name: "Primeiros Socorros",
  official_source: "Manual TAP 2026",
  status: "active" as const,
  questions_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

function mockGetByPath(responses: { axes?: unknown; subjects?: unknown }) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/axes") {
      return Promise.resolve({
        data: responses.axes ?? { items: [axisA], page: 1, page_size: 100, total: 1 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    if (path === "/admin/subjects") {
      return Promise.resolve({
        data: responses.subjects ?? { items: [], page: 1, page_size: 20, total: 0 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    throw new Error(`GET não mockado para o path: ${path}`)
  })
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
})

describe("SubjectsPage", () => {
  it("lista as matérias retornadas pela API", async () => {
    mockGetByPath({ subjects: { items: [subjectA], page: 1, page_size: 20, total: 1 } })

    renderSubjectsPage()

    expect(await screen.findByText("Primeiros Socorros")).toBeInTheDocument()
    // "Salvamento" também aparece como <option> no filtro de eixo — escopa à tabela.
    expect(within(screen.getByRole("table")).getByText("Salvamento")).toBeInTheDocument()
    expect(screen.getByText("Manual TAP 2026")).toBeInTheDocument()
  })

  it("cria uma nova matéria pelo diálogo", async () => {
    mockGetByPath({})
    mockedApiClient.POST.mockResolvedValue({
      data: subjectA,
      error: undefined,
      response: new Response(null, { status: 201 }),
    })

    renderSubjectsPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhuma matéria encontrada.")
    await user.click(screen.getByRole("button", { name: "Nova matéria" }))

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Salvamento" }))
    await user.type(within(dialog).getByLabelText("Nome"), "Primeiros Socorros")
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/admin/subjects",
        expect.objectContaining({
          body: expect.objectContaining({ axis_id: "axis-1", name: "Primeiros Socorros" }),
        }),
      ),
    )
  })

  it("mostra erro inline quando o nome já está em uso no eixo (409)", async () => {
    mockGetByPath({})
    mockedApiClient.POST.mockResolvedValue({
      data: undefined,
      error: {
        error: {
          code: "subject_name_in_use",
          message: "Já existe uma matéria ativa com este nome neste eixo",
          request_id: "req_test",
        },
      },
      response: new Response(null, { status: 409 }),
    })

    renderSubjectsPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhuma matéria encontrada.")
    await user.click(screen.getByRole("button", { name: "Nova matéria" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Salvamento" }))
    await user.type(within(dialog).getByLabelText("Nome"), "Primeiros Socorros")
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Já existe uma matéria ativa com este nome neste eixo"),
    )
  })

  it("alterna o rótulo do botão ao desativar/reativar uma matéria", async () => {
    mockGetByPath({ subjects: { items: [subjectA], page: 1, page_size: 20, total: 1 } })
    mockedApiClient.POST.mockResolvedValue({
      data: { ...subjectA, status: "archived", archived_at: "2026-01-02T00:00:00.000Z", warning: null },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderSubjectsPage()
    const user = userEvent.setup()

    await screen.findByText("Primeiros Socorros")
    await user.click(screen.getByRole("button", { name: "Desativar matéria" }))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/admin/subjects/{id}/archive",
        expect.objectContaining({ params: { path: { id: subjectA.id } } }),
      ),
    )
  })
})
