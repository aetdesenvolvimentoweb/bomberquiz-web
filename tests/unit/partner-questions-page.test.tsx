import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PartnerQuestionsPage } from "@/pages/partner/partner-questions-page"
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

// Mesmo padrão de cast usado em questions-page.test.tsx.
const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

function renderPartnerQuestionsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/parceiro/perguntas"]}>
        <PartnerQuestionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const subjectA = { id: "subject-1", name: "Primeiros Socorros", axis_id: "axis-1" }

const questionA = {
  id: "question-1",
  subject_id: "subject-1",
  subject_name: "Primeiros Socorros",
  axis_name: "Salvamento",
  statement_preview: "Qual o procedimento correto para X?",
  status: "draft" as const,
  has_image: false,
  created_at: "2026-01-01T00:00:00.000Z",
  submitted_at: null,
  published_at: null,
  rejection_reason: null,
  total_answers: 0,
  accuracy: 0,
  difficulty_level: "unrated" as const,
}

function mockGetByPath(responses: { subjects?: unknown; questions?: unknown }) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/subjects") {
      return Promise.resolve({
        data: responses.subjects ?? { items: [subjectA], page: 1, page_size: 100, total: 1 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    if (path === "/me/questions") {
      return Promise.resolve({
        data: responses.questions ?? { items: [], page: 1, page_size: 20, total: 0 },
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

describe("PartnerQuestionsPage", () => {
  it("lista as próprias perguntas retornadas pela API", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })

    renderPartnerQuestionsPage()

    expect(await screen.findByText("Qual o procedimento correto para X?")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("Primeiros Socorros")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("Rascunho")).toBeInTheDocument()
  })

  it("mostra badge de rejeitada quando rascunho tem rejection_reason", async () => {
    mockGetByPath({
      questions: {
        items: [{ ...questionA, rejection_reason: "Faltou fonte oficial." }],
        page: 1,
        page_size: 20,
        total: 1,
      },
    })

    renderPartnerQuestionsPage()

    const table = await screen.findByRole("table")
    expect(within(table).getByText("Rejeitada")).toBeInTheDocument()
  })

  it("cria um rascunho pelo diálogo (PART-RF-002)", async () => {
    mockGetByPath({ questions: { items: [], page: 1, page_size: 20, total: 0 } })
    mockedApiClient.POST.mockResolvedValue({
      data: { ...questionA },
      error: undefined,
      response: new Response(null, { status: 201 }),
    })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhuma pergunta encontrada.")
    await user.click(screen.getByRole("button", { name: "Nova pergunta" }))

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Primeiros Socorros" }))
    await user.type(within(dialog).getByLabelText("Enunciado"), "Qual o procedimento correto para X?")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 1"), "Alternativa A")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 2"), "Alternativa B")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 3"), "Alternativa C")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 4"), "Alternativa D")
    await user.type(within(dialog).getByLabelText("Justificativa"), "Porque a norma exige esse procedimento.")
    await user.click(within(dialog).getByRole("button", { name: "Salvar rascunho" }))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/me/questions",
        expect.objectContaining({
          body: expect.objectContaining({ subject_id: "subject-1", correct_index: 0 }),
        }),
      ),
    )
  })

  it("mostra erro quando alternativas duplicadas são rejeitadas (422)", async () => {
    mockGetByPath({ questions: { items: [], page: 1, page_size: 20, total: 0 } })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhuma pergunta encontrada.")
    await user.click(screen.getByRole("button", { name: "Nova pergunta" }))

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Primeiros Socorros" }))
    await user.type(within(dialog).getByLabelText("Enunciado"), "Qual o procedimento correto para X?")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 1"), "Igual")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 2"), "Igual")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 3"), "Outra")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 4"), "Mais uma")
    await user.type(within(dialog).getByLabelText("Justificativa"), "Porque a norma exige esse procedimento.")
    await user.click(within(dialog).getByRole("button", { name: "Salvar rascunho" }))

    expect(await within(dialog).findByText("Alternativas não podem ser duplicadas")).toBeInTheDocument()
    expect(apiClient.POST).not.toHaveBeenCalled()
  })
})
