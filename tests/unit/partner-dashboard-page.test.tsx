import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PartnerDashboardPage } from "@/pages/partner/partner-dashboard-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

const dashboard = {
  counts: { draft: 2, pending_review: 1, published: 5, archived: 0 },
  engagement: { total_answers_received: 120, avg_accuracy: 0.75 },
  by_subject: [
    { subject_id: "subject-1", subject_name: "Primeiros Socorros", count_published: 5, total_answers: 80, avg_accuracy: 0.6 },
  ],
  by_difficulty: { easy: 1, medium: 2, hard: 0, unrated: 2 },
  last_published: [{ id: "q1", statement_preview: "Pergunta publicada recente", published_at: "2026-08-01T00:00:00.000Z" }],
  last_rejected: [
    { id: "q2", statement_preview: "Pergunta rejeitada recente", rejection_reason: "Faltou fonte oficial.", rejected_at: "2026-07-30T00:00:00.000Z" },
  ],
  unread_review_events: 3,
}

function renderDashboardPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/parceiro/inicio"]}>
        <PartnerDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("PartnerDashboardPage (PART-RF-008)", () => {
  it("mostra os agregados retornados pela API", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(dashboard))

    renderDashboardPage()

    expect(await screen.findByText("Primeiros Socorros")).toBeInTheDocument()
    expect(screen.getByText("120")).toBeInTheDocument()
    expect(screen.getByText("80")).toBeInTheDocument()
    expect(screen.getByText("60%")).toBeInTheDocument()
    expect(screen.getByText("Pergunta publicada recente")).toBeInTheDocument()
    expect(screen.getByText("Pergunta rejeitada recente")).toBeInTheDocument()
    expect(screen.getByText("Faltou fonte oficial.")).toBeInTheDocument()
  })

  it("mostra o badge de eventos de revisão não lidos quando > 0", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(dashboard))

    renderDashboardPage()

    expect(await screen.findByText("3 evento(s) de revisão não lido(s)")).toBeInTheDocument()
  })

  it("não mostra o badge quando não há eventos não lidos", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ ...dashboard, unread_review_events: 0 }))

    renderDashboardPage()

    await screen.findByText("Primeiros Socorros")
    expect(screen.queryByText(/evento\(s\) de revisão/)).not.toBeInTheDocument()
  })

  it("mostra estado vazio quando não há perguntas publicadas/rejeitadas", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({
        counts: { draft: 0, pending_review: 0, published: 0, archived: 0 },
        engagement: { total_answers_received: 0, avg_accuracy: 0 },
        by_subject: [],
        by_difficulty: { easy: 0, medium: 0, hard: 0, unrated: 0 },
        last_published: [],
        last_rejected: [],
        unread_review_events: 0,
      }),
    )

    renderDashboardPage()

    expect(await screen.findByText("Nenhuma pergunta publicada ainda.")).toBeInTheDocument()
    expect(screen.getByText("Nenhuma pergunta rejeitada — bom trabalho!")).toBeInTheDocument()
  })
})
