import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { StartQuizPage } from "@/pages/quiz/start-quiz-page"
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

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

function errorResponse(code: string, message: string, status = 409) {
  return {
    data: undefined,
    error: { error: { code, message, request_id: "req_test" } },
    response: new Response(null, { status }),
  }
}

function renderStartQuizPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/quiz/iniciar"]}>
        <Routes>
          <Route path="/quiz/iniciar" element={<StartQuizPage />} />
          <Route path="/quiz/:quizId" element={<div data-testid="answer-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/axes") return Promise.resolve(jsonResponse({ items: [{ id: "axis-1", name: "Salvamento", tap_weight: 9 }], page: 1, page_size: 100, total: 1 }))
    if (path === "/subjects") return Promise.resolve(jsonResponse({ items: [{ id: "subject-1", name: "Primeiros Socorros", axis_id: "axis-1" }], page: 1, page_size: 100, total: 1 }))
    return Promise.resolve(errorResponse("not_found", "not mocked", 404))
  })
})

describe("StartQuizPage", () => {
  it("modo livre por matéria mostra o seletor de matéria; livre por eixo mostra o de eixo", async () => {
    renderStartQuizPage()
    const user = userEvent.setup()

    await user.click(screen.getByText("Livre por matéria"))
    expect(await screen.findByLabelText("Matéria")).toBeInTheDocument()
    expect(screen.queryByLabelText("Eixo")).not.toBeInTheDocument()

    await user.click(screen.getByText("Livre por eixo"))
    expect(await screen.findByLabelText("Eixo")).toBeInTheDocument()
    expect(screen.queryByLabelText("Matéria")).not.toBeInTheDocument()
  })

  it("bloqueia o submit sem matéria selecionada no modo livre por matéria", async () => {
    renderStartQuizPage()
    const user = userEvent.setup()

    await user.click(screen.getByText("Livre por matéria"))
    await screen.findByLabelText("Matéria")
    await user.click(screen.getByRole("button", { name: "Iniciar quiz" }))

    const messages = await screen.findAllByText("Selecione uma matéria")
    expect(messages.some((el) => el.className.includes("text-destructive"))).toBe(true)
    expect(mockedApiClient.POST).not.toHaveBeenCalled()
  })

  it("submit bem-sucedido no modo simulado TAP chama POST /quizzes e navega", async () => {
    mockedApiClient.POST.mockResolvedValue(
      jsonResponse(
        {
          quiz_id: "quiz-1",
          started_at: "2026-07-23T12:00:00.000Z",
          time_limit_seconds: null,
          explanation_mode: "after_each",
          total_questions: 20,
          questions: [],
        },
        201,
      ),
    )

    renderStartQuizPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Iniciar quiz" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/quizzes",
        expect.objectContaining({ body: expect.objectContaining({ mode: "tap_simulation", timer_enabled: false, explanation_mode: "after_each" }) }),
      ),
    )
    expect(await screen.findByTestId("answer-route")).toBeInTheDocument()
  })

  it("mostra a mensagem do servidor via toast quando o simulado TAP é impossível (409)", async () => {
    mockedApiClient.POST.mockResolvedValue(errorResponse("tap_simulation_impossible", "Não há perguntas suficientes para o simulado TAP."))

    renderStartQuizPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Iniciar quiz" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não há perguntas suficientes para o simulado TAP."))
  })
})
