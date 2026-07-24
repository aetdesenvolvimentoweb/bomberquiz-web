import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HistoryPage } from "@/pages/quiz/history-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

const historyItem = {
  id: "quiz-1",
  mode: "free_subject" as const,
  scope_name: "Matéria A",
  status: "finished" as const,
  started_at: "2026-07-20T12:00:00.000Z",
  finished_at: "2026-07-20T12:10:00.000Z",
  total_questions: 10,
  correct_count: 7,
  accuracy: 0.7,
}

function renderHistoryPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/historico"]}>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("HistoryPage", () => {
  it("lista os quizzes retornados e linka para o resultado", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [historyItem], page: 1, page_size: 20, total: 1 }))

    renderHistoryPage()

    expect(await screen.findByText("Matéria A")).toBeInTheDocument()
    expect(screen.getByText("Finalizado", { selector: "div" })).toBeInTheDocument()
    expect(screen.getByText("7/10")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver resultado" })).toHaveAttribute("href", "/quiz/quiz-1/resultado")
  })

  it("mostra estado vazio quando não há quizzes", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [], page: 1, page_size: 20, total: 0 }))

    renderHistoryPage()

    expect(await screen.findByText("Nenhum quiz encontrado.")).toBeInTheDocument()
  })

  it("o filtro de status dispara uma nova busca com o valor certo", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [], page: 1, page_size: 20, total: 0 }))

    renderHistoryPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhum quiz encontrado.")
    await user.selectOptions(screen.getByDisplayValue("Todos os status"), "abandoned")

    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenCalledWith(
        "/me/quizzes",
        expect.objectContaining({ params: { query: expect.objectContaining({ status: "abandoned" }) } }),
      ),
    )
  })
})
