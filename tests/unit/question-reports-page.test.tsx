import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { QuestionReportsPage } from "@/pages/admin/question-reports-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

function ok<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

const CONTENT = {
  statement: "Qual a primeira ação na avaliação primária?",
  alternatives: ["Segurança da cena", "Responsividade", "Pulso", "Vias aéreas"],
  correct_index: 0,
  explanation: "A cena vem antes da vítima.",
  source_reference: null,
}

const REPORT = {
  id: "r-1",
  reason: "answer_key",
  message: "Pelo manual, a responsividade vem primeiro.",
  status: "open",
  resolution: null,
  resolution_note: null,
  resolved_at: null,
  created_at: "2026-10-14T12:00:00.000Z",
  reporter: { id: "u-1", name: "Ana Souza", email: "ana@example.com" },
  quiz_id: "quiz-1",
  position: 2,
  snapshot: CONTENT,
}

const PAGE = {
  items: [
    {
      question: {
        ...CONTENT,
        id: "q-1",
        image_url: null,
        status: "published",
        subject_name: "Primeiros Socorros",
        author: { id: "p-1", name: "Carlos Parceiro", role: "partner" },
      },
      reports: [REPORT, { ...REPORT, id: "r-2", reason: "explanation", message: "A explicação cita o capítulo errado.", reporter: { id: "u-2", name: "Bruno", email: "b@example.com" } }],
    },
  ],
  page: 1,
  page_size: 10,
  total: 1,
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuestionReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedApiClient.GET.mockResolvedValue(ok(PAGE))
})

describe("QuestionReportsPage (QUIZ-RF-011)", () => {
  it("mostra a pergunta contestada com a versão atual, o autor e cada contestação", async () => {
    // Act
    renderPage()

    // Assert
    expect(await screen.findByText("2 contestações")).toBeInTheDocument()
    expect(screen.getByText(/Carlos Parceiro/)).toBeInTheDocument()
    expect(screen.getByText("Parceiro")).toBeInTheDocument()
    expect(screen.getByText("Pelo manual, a responsividade vem primeiro.")).toBeInTheDocument()
    expect(screen.getByText("Gabarito")).toBeInTheDocument()
    expect(screen.getByText(/Ana Souza \(ana@example.com\)/)).toBeInTheDocument()
    expect(mockedApiClient.GET).toHaveBeenCalledWith("/admin/question-reports", {
      params: { query: { status: "open", page: 1, page_size: 10 } },
    })
  })

  it("resolver manda resultado e nota para a pergunta inteira", async () => {
    // Arrange
    mockedApiClient.POST.mockResolvedValue(ok({ resolved: 2 }))
    renderPage()
    const user = userEvent.setup()
    await screen.findByText("2 contestações")

    // Act
    await user.click(screen.getByRole("button", { name: "Resolver" }))
    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("radio", { name: /Improcedente/ }))
    await user.type(within(dialog).getByLabelText("Resposta ao cliente"), "Conferimos no manual: a cena vem antes.")
    await user.click(within(dialog).getByRole("button", { name: "Resolver" }))

    // Assert
    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith("/admin/question-reports/{question_id}/resolve", {
        params: { path: { question_id: "q-1" } },
        body: { resolution: "dismissed", note: "Conferimos no manual: a cena vem antes." },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Resolvidas — 2 clientes foram avisados.")
  })

  it("aba Resolvidas consulta com status=resolved e esconde as ações", async () => {
    // Arrange
    renderPage()
    const user = userEvent.setup()
    await screen.findByText("2 contestações")

    // Act
    await user.click(screen.getByRole("button", { name: "Resolvidas" }))

    // Assert
    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenCalledWith("/admin/question-reports", {
        params: { query: { status: "resolved", page: 1, page_size: 10 } },
      }),
    )
    expect(screen.queryByRole("button", { name: "Editar pergunta" })).not.toBeInTheDocument()
  })
})
