import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PartnerQuestionDetailPage } from "@/pages/partner/partner-question-detail-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

const questionDetail = {
  id: "question-1",
  subject_id: "subject-1",
  subject_name: "Primeiros Socorros",
  axis_name: "Salvamento",
  statement: "Qual o procedimento correto para X?",
  alternatives: ["A", "B", "C", "D"],
  correct_index: 0,
  explanation: "Justificativa.",
  source_reference: null,
  image_url: null,
  status: "published" as const,
  source: "manual" as const,
  author_id: "partner-1",
  author_name: "Parceiro Teste",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  published_at: "2026-01-05T00:00:00.000Z",
  archived_at: null,
  stats_reset_at: null,
  reviewed_by: "admin-1",
  reviewed_at: "2026-01-05T00:00:00.000Z",
  rejection_reason: null,
  total_answers: 0,
  accuracy: 0,
}

const history = [
  { event: "submitted" as const, at: "2026-01-02T00:00:00.000Z", by_admin_name: null, notes: null, rejection_reason: null },
  {
    event: "rejected" as const,
    at: "2026-01-03T00:00:00.000Z",
    by_admin_name: "Admin Revisor",
    notes: null,
    rejection_reason: "Faltou fonte oficial.",
  },
  {
    event: "approved" as const,
    at: "2026-01-05T00:00:00.000Z",
    by_admin_name: "Admin Revisor",
    notes: "Ótima pergunta",
    rejection_reason: null,
  },
]

function mockGetByPath(responses: { question?: unknown; history?: unknown }) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/me/questions/{id}") return Promise.resolve(jsonResponse(responses.question ?? questionDetail))
    if (path === "/me/questions/{id}/review-history") return Promise.resolve(jsonResponse(responses.history ?? history))
    throw new Error(`GET não mockado para o path: ${path}`)
  })
}

function renderDetailPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/parceiro/perguntas/question-1"]}>
        <Routes>
          <Route path="/parceiro/perguntas/:id" element={<PartnerQuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("PartnerQuestionDetailPage (PART-RF-007)", () => {
  it("mostra o enunciado, status e a timeline de eventos em ordem cronológica", async () => {
    mockGetByPath({})

    renderDetailPage()

    expect(await screen.findByText("Qual o procedimento correto para X?")).toBeInTheDocument()
    expect(screen.getByText("Publicada")).toBeInTheDocument()
    expect(screen.getByText("Enviada para revisão")).toBeInTheDocument()
    expect(screen.getByText("Rejeitada")).toBeInTheDocument()
    expect(screen.getByText("Faltou fonte oficial.")).toBeInTheDocument()
    expect(screen.getByText("Aprovada")).toBeInTheDocument()
    expect(screen.getByText("Ótima pergunta")).toBeInTheDocument()
    expect(screen.getAllByText("Por Admin Revisor")).toHaveLength(2)
  })

  it("mostra estado vazio quando a pergunta nunca foi revisada", async () => {
    mockGetByPath({ history: [] })

    renderDetailPage()

    expect(await screen.findByText("Esta pergunta ainda não passou por revisão.")).toBeInTheDocument()
  })
})
