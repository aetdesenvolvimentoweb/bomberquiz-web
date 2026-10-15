import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { ReportQuestionButton } from "@/pages/quiz/report-question-button"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { POST: ReturnType<typeof vi.fn> }

function renderButton() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportQuestionButton quizId="quiz-1" position={3} />
    </QueryClientProvider>,
  )
}

async function fillAndSend() {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Reportar problema" }))
  const dialog = await screen.findByRole("dialog")
  await user.click(within(dialog).getByRole("radio", { name: "Gabarito" }))
  await user.type(within(dialog).getByLabelText("Explique o problema"), "A alternativa B também está correta.")
  await user.click(within(dialog).getByRole("button", { name: "Enviar" }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ReportQuestionButton (QUIZ-RF-011)", () => {
  it("envia motivo e mensagem para a questão certa e vira 'Problema reportado'", async () => {
    // Arrange
    mockedApiClient.POST.mockResolvedValue({
      data: { id: "r-1", status: "open", created_at: "2026-10-15T12:00:00.000Z" },
      error: undefined,
      response: new Response(null, { status: 201 }),
    })
    renderButton()

    // Act
    await fillAndSend()

    // Assert
    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith("/quizzes/{id}/questions/{position}/report", {
        params: { path: { id: "quiz-1", position: 3 } },
        body: { reason: "answer_key", message: "A alternativa B também está correta." },
      }),
    )
    expect(await screen.findByText("Problema reportado. Obrigado!")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reportar problema" })).not.toBeInTheDocument()
  })

  it("sem motivo e com mensagem curta, não envia", async () => {
    // Arrange
    renderButton()
    const user = userEvent.setup()

    // Act
    await user.click(screen.getByRole("button", { name: "Reportar problema" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Explique o problema"), "ruim")
    await user.click(within(dialog).getByRole("button", { name: "Enviar" }))

    // Assert
    expect(await within(dialog).findByText("Escolha o que está errado")).toBeInTheDocument()
    expect(within(dialog).getByText("Descreva o problema em pelo menos 10 caracteres")).toBeInTheDocument()
    expect(mockedApiClient.POST).not.toHaveBeenCalled()
  })

  it("já contestada (409): avisa e trata como reportada", async () => {
    // Arrange
    mockedApiClient.POST.mockResolvedValue({
      data: undefined,
      error: {
        error: { code: "question_already_reported", message: "Você já contestou esta questão.", request_id: "req" },
      },
      response: new Response(null, { status: 409 }),
    })
    renderButton()

    // Act
    await fillAndSend()

    // Assert
    expect(await screen.findByText("Problema reportado. Obrigado!")).toBeInTheDocument()
    expect(toast.info).toHaveBeenCalledWith("Você já contestou esta questão.")
  })
})
