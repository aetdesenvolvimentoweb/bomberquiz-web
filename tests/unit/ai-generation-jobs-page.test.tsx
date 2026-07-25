import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AiGenerationJobsPage } from "@/pages/admin/ai-generation-jobs-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

// Ver mesmo comentário em axes-page.test.tsx sobre o tipo genérico do openapi-fetch.
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

const jobA = {
  id: "job-1",
  status: "completed" as const,
  subject_name: "Salvamento em Altura",
  material_name: "material.pdf",
  question_count_requested: 10,
  question_count_generated: 8,
  summary: { pending: 2, approved: 6, discarded: 0 },
  error_message: null,
  created_at: "2026-01-01T00:00:00.000Z",
  completed_at: "2026-01-01T00:05:00.000Z",
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("AiGenerationJobsPage", () => {
  it("lista os jobs retornados pela API", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [jobA], page: 1, page_size: 20, total: 1 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderJobsPage()

    expect(await screen.findByText("Salvamento em Altura")).toBeInTheDocument()
    expect(screen.getByText("material.pdf")).toBeInTheDocument()
    expect(screen.getByText("Concluído")).toBeInTheDocument()
    expect(screen.getByText("8 / 10")).toBeInTheDocument()
  })

  it("mostra estado vazio quando não há jobs", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [], page: 1, page_size: 20, total: 0 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderJobsPage()

    expect(await screen.findByText("Nenhum job de geração ainda.")).toBeInTheDocument()
  })

  it("mostra o botão para iniciar uma nova geração", async () => {
    mockedApiClient.GET.mockResolvedValue({
      data: { items: [], page: 1, page_size: 20, total: 0 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderJobsPage()

    expect(await screen.findByRole("link", { name: "Nova geração" })).toHaveAttribute(
      "href",
      "/painel/geracao-ia/novo",
    )
  })
})
