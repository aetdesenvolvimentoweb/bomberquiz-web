import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ResultQuizPage } from "@/pages/quiz/result-quiz-page"
import { apiClient } from "@/lib/api/client"
import type { QuizResultResponse } from "@/features/quiz/quiz-api"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

function buildResult(overrides: Partial<QuizResultResponse> = {}): QuizResultResponse {
  return {
    quiz_id: "quiz-1",
    mode: "free_subject",
    status: "finished",
    started_at: "2026-07-23T12:00:00.000Z",
    finished_at: "2026-07-23T12:10:00.000Z",
    duration_seconds: 600,
    total_questions: 1,
    answered_count: 1,
    correct_count: 0,
    accuracy: 0,
    breakdown_by_subject: [{ subject_id: "subj-1", subject_name: "Matéria A", total: 1, correct: 0, accuracy: 0 }],
    questions: [
      {
        position: 1,
        question_id: "q1",
        subject_name: "Matéria A",
        statement: "Qual o procedimento correto?",
        image_url: null,
        alternatives: ["Opção A", "Opção B", "Opção C", "Opção D"],
        submitted_index: 1,
        correct_index: 0,
        is_correct: false,
        explanation: "Porque a opção A está correta segundo a norma.",
        source_reference: "NT-01",
      },
    ],
    ...overrides,
  }
}

function renderResultQuizPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/quiz/quiz-1/resultado"]}>
        <Routes>
          <Route path="/quiz/:quizId/resultado" element={<ResultQuizPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("ResultQuizPage", () => {
  it("mostra o cabeçalho e a tabela de desempenho por matéria", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(buildResult()))

    renderResultQuizPage()

    expect(await screen.findByText("Finalizado")).toBeInTheDocument()
    expect(screen.getByText("Matéria A")).toBeInTheDocument()
  })

  it("mostra gabarito e explicação mesmo quando a resposta submetida está errada", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(buildResult()))

    renderResultQuizPage()

    expect(await screen.findByText("Qual o procedimento correto?")).toBeInTheDocument()
    expect(screen.getByText("Porque a opção A está correta segundo a norma.")).toBeInTheDocument()
    expect(screen.getByText("(gabarito)")).toBeInTheDocument()
    expect(screen.getByText("(sua resposta)")).toBeInTheDocument()
  })

  it("distingue não respondida por abandono (não penaliza) de não respondida contada como erro", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse(
        buildResult({
          status: "abandoned",
          questions: [
            { ...buildResult().questions[0]!, submitted_index: null, is_correct: null },
          ],
        }),
      ),
    )

    renderResultQuizPage()

    expect(await screen.findByText("Não respondida")).toBeInTheDocument()
  })
})
