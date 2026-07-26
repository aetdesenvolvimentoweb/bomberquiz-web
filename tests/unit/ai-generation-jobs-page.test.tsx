import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AiGenerationJobsPage } from "@/pages/admin/ai-generation-jobs-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function renderJobsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/geracao-ia"]}>
        <AiGenerationJobsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const subjectA = {
  id: "subject-1",
  axis_id: "axis-1",
  axis_name: "Salvamento",
  name: "Primeiros Socorros",
  official_source: null,
  status: "active" as const,
  questions_count: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

const jobA = {
  id: "job-1",
  status: "completed" as const,
  subject_name: "Salvamento em Altura",
  material_name: "material.pdf",
  question_count_requested: 10,
  question_count_generated: 8,
  summary: { pending: 2, approved: 6, discarded: 0 },
  error_message: null as string | null,
  created_at: "2026-01-01T00:00:00.000Z",
  completed_at: "2026-01-01T00:05:00.000Z",
}

const jobFailed = {
  ...jobA,
  id: "job-2",
  status: "failed" as const,
  summary: null as { pending: number; approved: number; discarded: number } | null,
  error_message: "Timeout no processamento",
}

const jobPending = {
  ...jobA,
  id: "job-3",
  status: "pending" as const,
  question_count_generated: null as number | null,
  summary: null as { pending: number; approved: number; discarded: number } | null,
}

function mockGetByPath(responses: { subjects?: unknown; jobs?: unknown }) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/subjects") {
      return Promise.resolve({
        data: responses.subjects ?? { items: [subjectA], page: 1, page_size: 100, total: 1 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    if (path === "/admin/ai-generation/jobs") {
      return Promise.resolve({
        data: responses.jobs ?? { items: [jobA], page: 1, page_size: 20, total: 1 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    throw new Error(`GET não mockado para o path: ${path}`)
  })
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("AiGenerationJobsPage", () => {
  it("lista os jobs retornados pela API", async () => {
    mockGetByPath({ jobs: { items: [jobA], page: 1, page_size: 20, total: 1 } })

    renderJobsPage()

    expect(await screen.findByText("Salvamento em Altura")).toBeInTheDocument()
    const table = screen.getByRole("table")
    expect(within(table).getByText("material.pdf")).toBeInTheDocument()
    expect(within(table).getByText("Concluído")).toBeInTheDocument()
    expect(within(table).getByText("8 / 10")).toBeInTheDocument()
  })

  it("mostra estado vazio quando não há jobs", async () => {
    mockGetByPath({ jobs: { items: [], page: 1, page_size: 20, total: 0 } })

    renderJobsPage()

    expect(await screen.findByText("Nenhum job de geração ainda.")).toBeInTheDocument()
  })

  it("mostra o botão para iniciar uma nova geração", async () => {
    mockGetByPath({ jobs: { items: [], page: 1, page_size: 20, total: 0 } })

    renderJobsPage()

    expect(await screen.findByRole("link", { name: "Nova geração" })).toHaveAttribute(
      "href",
      "/painel/geracao-ia/novo",
    )
  })

  it("mostra os badges de resumo quando o job já terminou", async () => {
    mockGetByPath({ jobs: { items: [jobA], page: 1, page_size: 20, total: 1 } })

    renderJobsPage()

    await screen.findByText("Salvamento em Altura")
    expect(screen.getByText("6 aprovadas")).toBeInTheDocument()
    expect(screen.getByText("2 pendentes")).toBeInTheDocument()
    expect(screen.getByText("0 descartadas")).toBeInTheDocument()
  })

  it("mostra — no lugar do resumo enquanto o job não terminou", async () => {
    mockGetByPath({ jobs: { items: [jobPending], page: 1, page_size: 20, total: 1 } })

    renderJobsPage()

    const table = await screen.findByRole("table")
    const row = within(table).getByText("Pendente").closest("tr")!
    expect(within(row).getByText("—")).toBeInTheDocument()
  })

  it("mostra o error_message de um job failed no histórico", async () => {
    mockGetByPath({ jobs: { items: [jobFailed], page: 1, page_size: 20, total: 1 } })

    renderJobsPage()

    expect(await screen.findByText("Timeout no processamento")).toBeInTheDocument()
  })

  it("filtra por status e reseta a página", async () => {
    mockGetByPath({ jobs: { items: [jobA], page: 1, page_size: 20, total: 1 } })

    renderJobsPage()
    const user = userEvent.setup()

    await screen.findByText("Salvamento em Altura")
    await user.selectOptions(screen.getByDisplayValue("Todos os status"), "failed")

    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenLastCalledWith(
        "/admin/ai-generation/jobs",
        expect.objectContaining({
          params: { query: { status: "failed", subject_id: undefined, page: 1, page_size: 20 } },
        }),
      ),
    )
  })

  it("filtra por matéria", async () => {
    mockGetByPath({ jobs: { items: [jobA], page: 1, page_size: 20, total: 1 } })

    renderJobsPage()
    const user = userEvent.setup()

    await screen.findByText("Salvamento em Altura")
    await user.selectOptions(screen.getByDisplayValue("Todas as matérias"), "subject-1")

    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenLastCalledWith(
        "/admin/ai-generation/jobs",
        expect.objectContaining({
          params: { query: { status: undefined, subject_id: "subject-1", page: 1, page_size: 20 } },
        }),
      ),
    )
  })

  it("pagina para a próxima página e volta com os controles de paginação", async () => {
    mockGetByPath({ jobs: { items: [jobA], page: 1, page_size: 20, total: 21 } })

    renderJobsPage()
    const user = userEvent.setup()

    await screen.findByText("Salvamento em Altura")
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Próxima página" }))

    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenLastCalledWith(
        "/admin/ai-generation/jobs",
        expect.objectContaining({
          params: { query: { status: undefined, subject_id: undefined, page: 2, page_size: 20 } },
        }),
      ),
    )
  })
})
