import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AiGenerationJobDetailPage } from "@/pages/admin/ai-generation-job-detail-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), DELETE: vi.fn(), PATCH: vi.fn(), POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  DELETE: ReturnType<typeof vi.fn>
  PATCH: ReturnType<typeof vi.fn>
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

const baseJob = {
  id: "job-1",
  subject_id: "subject-1",
  subject_name: "Salvamento em Altura",
  material_name: "material.pdf",
  question_count_requested: 5,
  question_count_generated: null as number | null,
  queue_position: 0,
  model_used: null,
  prompt_tokens: null,
  completion_tokens: null,
  error_message: null as string | null,
  created_at: "2026-01-01T00:00:00.000Z",
  completed_at: null as string | null,
  questions: [],
  summary: null,
}

function renderDetailPage(jobId = "job-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/painel/geracao-ia/${jobId}`]}>
        <Routes>
          <Route path="/painel/geracao-ia/:jobId" element={<AiGenerationJobDetailPage />} />
          <Route path="/painel/geracao-ia" element={<div data-testid="jobs-list-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const generatedQuestion = {
  id: "question-1",
  generation_index: 0,
  review_status: "pending" as const,
  question_data: {
    statement: "Qual o procedimento correto para combate a incêndio classe A?",
    alternatives: ["Água", "Pó químico", "CO2", "Espuma"],
    correct_index: 0,
    explanation: "Água é o agente extintor mais indicado.",
    source_reference: null as string | null,
  },
  edited: false,
  approved_question_id: null as string | null,
  reviewed_at: null as string | null,
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.DELETE.mockReset()
  mockedApiClient.PATCH.mockReset()
  mockedApiClient.POST.mockReset()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("AiGenerationJobDetailPage", () => {
  it("mostra a posição na fila quando pending", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ ...baseJob, status: "pending", queue_position: 2 }))

    renderDetailPage()

    expect(await screen.findByText("Aguardando na fila — 2 job(s) à frente.")).toBeInTheDocument()
    expect(screen.getByText("Pendente")).toBeInTheDocument()
  })

  it("mostra mensagem de processamento quando processing", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ ...baseJob, status: "processing" }))

    renderDetailPage()

    expect(await screen.findByText(/Gerando questões/)).toBeInTheDocument()
    expect(screen.getByText("Processando")).toBeInTheDocument()
  })

  it("mostra o erro e a ação de excluir quando failed", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ ...baseJob, status: "failed", error_message: "Timeout no processamento" }),
    )
    mockedApiClient.DELETE.mockResolvedValue(jsonResponse({ deleted: true, approved_preserved: 0, removed_questions: 0 }))

    renderDetailPage()
    const user = userEvent.setup()

    expect(await screen.findByText("Timeout no processamento")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Excluir job" }))
    await user.click(await screen.findByRole("button", { name: "Excluir" }))

    await waitFor(() =>
      expect(mockedApiClient.DELETE).toHaveBeenCalledWith(
        "/admin/ai-generation/jobs/{id}",
        expect.objectContaining({ params: { path: { id: "job-1" } }, body: { confirm_discard_pending: false } }),
      ),
    )
    expect(await screen.findByTestId("jobs-list-route")).toBeInTheDocument()
  })

  it("pede confirmação extra ao excluir job failed com questões pendentes (409)", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ ...baseJob, status: "failed", error_message: "Erro no processamento do job" }))
    mockedApiClient.DELETE.mockResolvedValueOnce(
      errorResponse("ai_generation_job_has_pending_questions", "Ainda há 1 questões pendentes de revisão. Confirme o descarte."),
    ).mockResolvedValueOnce(jsonResponse({ deleted: true, approved_preserved: 0, removed_questions: 1 }))

    renderDetailPage()
    const user = userEvent.setup()

    await screen.findByText("Erro no processamento do job")
    await user.click(screen.getByRole("button", { name: "Excluir job" }))
    await user.click(await screen.findByRole("button", { name: "Excluir" }))

    expect(await screen.findByText("Ainda há questões pendentes de revisão")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Excluir mesmo assim" }))

    await waitFor(() =>
      expect(mockedApiClient.DELETE).toHaveBeenLastCalledWith(
        "/admin/ai-generation/jobs/{id}",
        expect.objectContaining({ body: { confirm_discard_pending: true } }),
      ),
    )
  })

  it("mostra o resumo quando completed", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ ...baseJob, status: "completed", question_count_generated: 4 }),
    )

    renderDetailPage()

    expect(await screen.findByText("4 de 5 questões geradas.")).toBeInTheDocument()
  })

  it("mostra erro quando o job não é encontrado (404)", async () => {
    mockedApiClient.GET.mockResolvedValue(errorResponse("ai_generation_job_not_found", "Job de geração não encontrado", 404))

    renderDetailPage()

    expect(await screen.findByText("Job de geração não encontrado")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Voltar ao histórico" })).toBeInTheDocument()
  })

  it("faz polling (refetchInterval) enquanto pending/processing e para ao completar", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    mockedApiClient.GET
      .mockResolvedValueOnce(jsonResponse({ ...baseJob, status: "processing" }))
      .mockResolvedValueOnce(jsonResponse({ ...baseJob, status: "completed", question_count_generated: 3 }))

    renderDetailPage()

    await vi.waitFor(() => expect(mockedApiClient.GET).toHaveBeenCalledTimes(1))

    await act(() => vi.advanceTimersByTimeAsync(3000))

    await vi.waitFor(() => expect(mockedApiClient.GET).toHaveBeenCalledTimes(2))
  })

  it("mostra a tabela de revisão com as questões geradas quando completed", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({
        ...baseJob,
        status: "completed",
        question_count_generated: 2,
        questions: [
          generatedQuestion,
          {
            ...generatedQuestion,
            id: "question-2",
            review_status: "approved",
            question_data: { ...generatedQuestion.question_data, statement: "Questão já aprovada" },
          },
        ],
      }),
    )

    renderDetailPage()

    expect(await screen.findByText(/Qual o procedimento correto/)).toBeInTheDocument()
    const table = screen.getByRole("table")
    expect(within(table).getByText("Pendente")).toBeInTheDocument()
    expect(within(table).getByText("Aprovada")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aprovar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Descartar" })).toBeInTheDocument()

    const approvedRow = within(table).getByText("Questão já aprovada").closest("tr")!
    expect(within(approvedRow).queryByRole("button")).not.toBeInTheDocument()
  })

  it("aprova uma questão pendente", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ ...baseJob, status: "completed", question_count_generated: 1, questions: [generatedQuestion] }),
    )
    mockedApiClient.POST.mockResolvedValue(jsonResponse({ ...generatedQuestion, review_status: "approved" }))

    renderDetailPage()
    const user = userEvent.setup()

    await screen.findByText(/Qual o procedimento correto/)
    await user.click(screen.getByRole("button", { name: "Aprovar" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/admin/ai-generation/jobs/{job_id}/questions/{question_id}/approve",
        expect.objectContaining({ params: { path: { job_id: "job-1", question_id: "question-1" } } }),
      ),
    )
    expect(toast.success).toHaveBeenCalledWith("Questão aprovada e publicada.")
  })

  it("edita uma questão pendente", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ ...baseJob, status: "completed", question_count_generated: 1, questions: [generatedQuestion] }),
    )
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse({ ...generatedQuestion, edited: true }))

    renderDetailPage()
    const user = userEvent.setup()

    await screen.findByText(/Qual o procedimento correto/)
    await user.click(screen.getByRole("button", { name: "Editar" }))

    const dialog = await screen.findByRole("dialog")
    const statementField = within(dialog).getByLabelText("Enunciado")
    await user.clear(statementField)
    await user.type(statementField, "Enunciado revisado com mais de dez caracteres")
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(mockedApiClient.PATCH).toHaveBeenCalledWith(
        "/admin/ai-generation/jobs/{job_id}/questions/{question_id}",
        expect.objectContaining({
          params: { path: { job_id: "job-1", question_id: "question-1" } },
          body: expect.objectContaining({ statement: "Enunciado revisado com mais de dez caracteres" }),
        }),
      ),
    )
    expect(toast.success).toHaveBeenCalledWith("Questão atualizada.")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("descarta uma questão pendente com motivo opcional", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ ...baseJob, status: "completed", question_count_generated: 1, questions: [generatedQuestion] }),
    )
    mockedApiClient.POST.mockResolvedValue(jsonResponse({ ...generatedQuestion, review_status: "discarded" }))

    renderDetailPage()
    const user = userEvent.setup()

    await screen.findByText(/Qual o procedimento correto/)
    await user.click(screen.getByRole("button", { name: "Descartar" }))

    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Motivo (opcional)"), "Fora do escopo da matéria")
    await user.click(within(dialog).getByRole("button", { name: "Descartar" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/admin/ai-generation/jobs/{job_id}/questions/{question_id}/discard",
        expect.objectContaining({
          params: { path: { job_id: "job-1", question_id: "question-1" } },
          body: { reason: "Fora do escopo da matéria" },
        }),
      ),
    )
    expect(toast.success).toHaveBeenCalledWith("Questão descartada.")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })
})
