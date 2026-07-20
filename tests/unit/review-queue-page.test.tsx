import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReviewQueuePage } from "@/pages/admin/review-queue-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

function renderReviewQueuePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/revisao"]}>
        <ReviewQueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const pendingQuestionA = {
  id: "question-1",
  subject_id: "subject-1",
  subject_name: "Primeiros Socorros",
  axis_name: "Salvamento",
  statement_preview: "Qual o procedimento correto para X?",
  status: "pending_review" as const,
  author_id: "partner-1",
  author_name: "Parceiro Teste",
  has_image: false,
  created_at: "2026-01-01T00:00:00.000Z",
  published_at: null,
  archived_at: null,
  total_answers: 0,
  accuracy: 0,
  submitted_at: "2026-01-01T00:00:00.000Z",
  partner_pending_count: 2,
}

function mockGetPending(items: unknown[] = [pendingQuestionA]) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/questions/pending") {
      return Promise.resolve({
        data: { items, page: 1, page_size: 20, total: items.length },
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

describe("ReviewQueuePage", () => {
  it("lista as perguntas pendentes com autor e contagem de pendências", async () => {
    mockGetPending()

    renderReviewQueuePage()

    expect(await screen.findByText("Qual o procedimento correto para X?")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("Parceiro Teste")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("2")).toBeInTheDocument()
  })

  it("mostra mensagem quando a fila está vazia", async () => {
    mockGetPending([])

    renderReviewQueuePage()

    expect(await screen.findByText("Nenhuma pergunta aguardando revisão.")).toBeInTheDocument()
  })

  it("aprova uma pergunta pelo botão Aprovar", async () => {
    mockGetPending()
    mockedApiClient.POST.mockResolvedValue({
      data: { ...pendingQuestionA, status: "published" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderReviewQueuePage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Aprovar" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/admin/questions/{id}/approve",
        expect.objectContaining({ params: { path: { id: "question-1" } } }),
      ),
    )
  })

  it("rejeita uma pergunta com motivo obrigatório pelo diálogo", async () => {
    mockGetPending()
    mockedApiClient.POST.mockResolvedValue({
      data: { ...pendingQuestionA, status: "draft" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderReviewQueuePage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Rejeitar" }))

    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Motivo"), "Fonte oficial desatualizada, revisar a norma.")
    await user.click(within(dialog).getByRole("button", { name: "Rejeitar" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/admin/questions/{id}/reject",
        expect.objectContaining({
          params: { path: { id: "question-1" } },
          body: { reason: "Fonte oficial desatualizada, revisar a norma." },
        }),
      ),
    )
  })
})
