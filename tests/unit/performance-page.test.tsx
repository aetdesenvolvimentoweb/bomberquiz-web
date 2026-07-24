import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PerformancePage } from "@/pages/quiz/performance-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn>; POST: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

const performanceFixture = {
  overall: { total_answers: 100, correct_answers: 65, accuracy: 0.65, quizzes_finished: 5 },
  by_axis: [
    {
      axis_id: "axis-1",
      axis_name: "Salvamento",
      total: 100,
      correct: 65,
      accuracy: 0.65,
      subjects: [
        { subject_id: "subj-1", subject_name: "Matéria Forte", total: 20, correct: 18, accuracy: 0.9, last_answered_at: null, status_badge: "forte" as const },
        { subject_id: "subj-2", subject_name: "Matéria Fraca", total: 20, correct: 4, accuracy: 0.2, last_answered_at: null, status_badge: "fraco" as const },
      ],
    },
  ],
  weakest_subjects: [{ subject_id: "subj-2", subject_name: "Matéria Fraca", total: 20, correct: 4, accuracy: 0.2, last_answered_at: null, status_badge: "fraco" as const }],
  strongest_subjects: [{ subject_id: "subj-1", subject_name: "Matéria Forte", total: 20, correct: 18, accuracy: 0.9, last_answered_at: null, status_badge: "forte" as const }],
  stats_reset_at: null,
}

const timelineFixture = {
  stats_reset_at: null,
  months: [{ month: "2026-07", total_answers: 10, correct_answers: 6, accuracy: 0.6, quizzes_finished: 1 }],
}

function renderPerformancePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/desempenho"]}>
        <PerformancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/me/performance") return Promise.resolve(jsonResponse(performanceFixture))
    if (path === "/me/performance/timeline") return Promise.resolve(jsonResponse(timelineFixture))
    return Promise.resolve({ data: undefined, error: { error: { code: "not_found", message: "not mocked", request_id: "req" } }, response: new Response(null, { status: 404 }) })
  })
})

describe("PerformancePage", () => {
  it("mostra os cards de overall e as listas de pontos fortes/fracos", async () => {
    renderPerformancePage()

    expect(await screen.findByText("65%")).toBeInTheDocument()
    expect(screen.getByText("65/100")).toBeInTheDocument()
    expect(screen.getByText("Pontos fracos")).toBeInTheDocument()
    expect(screen.getByText("Pontos fortes")).toBeInTheDocument()
    const weakestSection = screen.getByText("Pontos fracos").closest("div")!
    expect(weakestSection.textContent).toContain("Matéria Fraca")
    const strongestSection = screen.getByText("Pontos fortes").closest("div")!
    expect(strongestSection.textContent).toContain("Matéria Forte")
  })

  it("trocar o período da timeline dispara nova busca com months certo", async () => {
    renderPerformancePage()
    const user = userEvent.setup()

    await screen.findByLabelText("Período")
    await user.selectOptions(screen.getByLabelText("Período"), "6")

    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenCalledWith("/me/performance/timeline", { params: { query: { months: 6 } } }),
    )
  })

  it("reset de estatísticas: senha errada mostra erro de campo", async () => {
    mockedApiClient.POST.mockResolvedValue({
      data: undefined,
      error: { error: { code: "invalid_password", message: "Senha incorreta.", request_id: "req", fields: [{ field: "password", code: "invalid", message: "Senha incorreta." }] } },
      response: new Response(null, { status: 401 }),
    })

    renderPerformancePage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Zerar estatísticas" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Senha"), "SenhaErrada123")
    await user.click(within(dialog).getByRole("checkbox"))
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }))

    expect(await within(dialog).findByText("Senha incorreta.")).toBeInTheDocument()
  })
})
