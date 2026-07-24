import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AnswerQuizPage } from "@/pages/quiz/answer-quiz-page"
import { apiClient } from "@/lib/api/client"
import type { StartQuizResponse } from "@/features/quiz/quiz-api"

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

function buildStartPayload(overrides: Partial<StartQuizResponse> = {}): StartQuizResponse {
  return {
    quiz_id: "quiz-1",
    started_at: new Date().toISOString(),
    time_limit_seconds: null,
    explanation_mode: "after_each",
    total_questions: 2,
    questions: [
      { position: 1, question_id: "q1", subject_name: "Matéria A", statement: "Enunciado 1", image_url: null, alternatives: ["A", "B", "C", "D"] },
      { position: 2, question_id: "q2", subject_name: "Matéria A", statement: "Enunciado 2", image_url: null, alternatives: ["A", "B", "C", "D"] },
    ],
    ...overrides,
  }
}

function renderAnswerQuizPage(startPayload: StartQuizResponse) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/quiz/${startPayload.quiz_id}`, state: { startPayload } }]}>
        <Routes>
          <Route path="/quiz/:quizId" element={<AnswerQuizPage />} />
          <Route path="/quiz/:quizId/resultado" element={<div data-testid="result-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("AnswerQuizPage", () => {
  it("no modo after_each mostra o banner de feedback antes de avançar", async () => {
    mockedApiClient.POST.mockResolvedValueOnce(
      jsonResponse({ correct: true, correct_index: 0, explanation: "Porque sim.", source_reference: null, quiz_finished: false }),
    )

    renderAnswerQuizPage(buildStartPayload({ explanation_mode: "after_each" }))
    const user = userEvent.setup()

    await user.click(screen.getByLabelText("A"))
    await user.click(screen.getByRole("button", { name: "Responder" }))

    expect(await screen.findByText("Você acertou")).toBeInTheDocument()
    expect(screen.getByText("Porque sim.")).toBeInTheDocument()
    expect(screen.queryByText("Questão 2 de 2")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Próxima questão" }))
    expect(await screen.findByText("Questão 2 de 2")).toBeInTheDocument()
  })

  it("no modo at_end avança direto, sem revelar gabarito", async () => {
    mockedApiClient.POST.mockResolvedValueOnce(jsonResponse({ recorded: true, quiz_finished: false }))

    renderAnswerQuizPage(buildStartPayload({ explanation_mode: "at_end" }))
    const user = userEvent.setup()

    await user.click(screen.getByLabelText("A"))
    await user.click(screen.getByRole("button", { name: "Responder" }))

    expect(await screen.findByText("Questão 2 de 2")).toBeInTheDocument()
    expect(screen.queryByText("Você acertou")).not.toBeInTheDocument()
  })

  it("navega para o resultado quando a última resposta retorna quiz_finished", async () => {
    mockedApiClient.POST.mockResolvedValueOnce(jsonResponse({ recorded: true, quiz_finished: true }))

    renderAnswerQuizPage(buildStartPayload({ explanation_mode: "at_end", total_questions: 1, questions: [buildStartPayload().questions[0]!] }))
    const user = userEvent.setup()

    await user.click(screen.getByLabelText("A"))
    await user.click(screen.getByRole("button", { name: "Responder" }))

    expect(await screen.findByTestId("result-route")).toBeInTheDocument()
  })

  it("um 409 quiz_expired na submissão navega para o resultado com toast", async () => {
    mockedApiClient.POST.mockResolvedValueOnce(errorResponse("quiz_expired", "O tempo do quiz esgotou."))

    renderAnswerQuizPage(buildStartPayload())
    const user = userEvent.setup()

    await user.click(screen.getByLabelText("A"))
    await user.click(screen.getByRole("button", { name: "Responder" }))

    expect(await screen.findByTestId("result-route")).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("Tempo esgotado.")
  })

  it("o cronômetro chegando a zero dispara o encerramento automático e navega", async () => {
    vi.useFakeTimers()
    mockedApiClient.POST.mockResolvedValueOnce(
      jsonResponse({
        quiz_id: "quiz-1",
        mode: "free_subject",
        status: "finished",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_seconds: 60,
        total_questions: 2,
        answered_count: 0,
        correct_count: 0,
        accuracy: 0,
        breakdown_by_subject: [],
        questions: [],
      }),
    )

    renderAnswerQuizPage(buildStartPayload({ time_limit_seconds: 60 }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000)
    })

    expect(screen.getByTestId("result-route")).toBeInTheDocument()
    expect(mockedApiClient.POST).toHaveBeenCalledWith("/quizzes/{id}/finish", expect.objectContaining({ params: { path: { id: "quiz-1" } } }))
  })

  it("encerrar com questões em branco mostra o alerta com a contagem certa", async () => {
    renderAnswerQuizPage(buildStartPayload())
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Encerrar quiz" }))

    expect(await screen.findByText("Você tem 2 questões em branco — elas contarão como erro. Encerrar mesmo assim?")).toBeInTheDocument()
  })
})
