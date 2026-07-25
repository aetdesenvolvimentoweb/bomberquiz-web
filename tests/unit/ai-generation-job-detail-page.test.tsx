import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AiGenerationJobDetailPage } from "@/pages/admin/ai-generation-job-detail-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), DELETE: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  DELETE: ReturnType<typeof vi.fn>
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

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.DELETE.mockReset()
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
})
