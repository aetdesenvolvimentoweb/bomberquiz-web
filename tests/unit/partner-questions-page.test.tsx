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
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Mesmo padrão de cast usado em questions-page.test.tsx.
const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
  PATCH: ReturnType<typeof vi.fn>
  DELETE: ReturnType<typeof vi.fn>
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

const questionADetail = {
  id: "question-1",
  subject_id: "subject-1",
  subject_name: "Primeiros Socorros",
  axis_name: "Salvamento",
  statement: "Qual o procedimento correto para X?",
  alternatives: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
  correct_index: 0,
  explanation: "Porque a norma exige esse procedimento.",
  source_reference: null,
  image_url: null,
  status: "draft" as const,
  source: "manual" as const,
  author_id: "partner-1",
  author_name: "Parceiro Teste",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  published_at: null,
  archived_at: null,
  stats_reset_at: null,
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  total_answers: 0,
  accuracy: 0,
}

function mockGetByPath(responses: { subjects?: unknown; questions?: unknown; questionDetail?: unknown }) {
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
    if (path === "/me/questions/{id}") {
      return Promise.resolve({
        data: responses.questionDetail ?? questionADetail,
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
  mockedApiClient.PATCH.mockReset()
  mockedApiClient.DELETE.mockReset()
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

  it("edita um rascunho pelo diálogo (PART-RF-003)", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })
    mockedApiClient.PATCH.mockResolvedValue({
      data: { ...questionADetail, statement: "Enunciado revisado" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))
    await user.click(await screen.findByText("Editar"))

    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText("Editar pergunta")).toBeInTheDocument()
    const statementField = within(dialog).getByLabelText("Enunciado")
    await user.clear(statementField)
    await user.type(statementField, "Enunciado revisado com mais detalhe")
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(apiClient.PATCH).toHaveBeenCalledWith(
        "/me/questions/{id}",
        expect.objectContaining({
          params: { path: { id: "question-1" } },
          body: expect.objectContaining({ statement: "Enunciado revisado com mais detalhe" }),
        }),
      ),
    )
  })

  it("mostra aviso de resubmissão ao editar pergunta publicada (CA-3)", async () => {
    mockGetByPath({
      questions: { items: [{ ...questionA, status: "published" }], page: 1, page_size: 20, total: 1 },
      questionDetail: { ...questionADetail, status: "published" },
    })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))
    await user.click(await screen.findByText("Editar"))

    const dialog = await screen.findByRole("dialog")
    expect(
      await within(dialog).findByText(
        "Esta pergunta voltará para revisão e ficará indisponível para clientes até a nova aprovação.",
      ),
    ).toBeInTheDocument()
  })

  it("envia rascunho para revisão pelo menu de ações (PART-RF-004)", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })
    mockedApiClient.POST.mockResolvedValue({
      data: { ...questionADetail, status: "pending_review" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))
    await user.click(await screen.findByText("Enviar para revisão"))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/me/questions/{id}/submit",
        expect.objectContaining({ params: { path: { id: "question-1" } } }),
      ),
    )
  })

  it("exclui um rascunho após confirmação (PART-RF-005)", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })
    mockedApiClient.DELETE.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 204 }),
    })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))
    await user.click(await screen.findByText("Excluir"))

    const alert = await screen.findByRole("dialog")
    expect(within(alert).getByText("Excluir rascunho?")).toBeInTheDocument()
    await user.click(within(alert).getByRole("button", { name: "Excluir" }))

    await waitFor(() =>
      expect(apiClient.DELETE).toHaveBeenCalledWith(
        "/me/questions/{id}",
        expect.objectContaining({ params: { path: { id: "question-1" } } }),
      ),
    )
  })

  it("não mostra ação de excluir numa pergunta publicada", async () => {
    mockGetByPath({ questions: { items: [{ ...questionA, status: "published" }], page: 1, page_size: 20, total: 1 } })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))

    expect(await screen.findByText("Editar")).toBeInTheDocument()
    expect(screen.queryByText("Excluir")).not.toBeInTheDocument()
  })

  it("pending_review/archived só têm a ação Ver histórico (sem editar/enviar/excluir)", async () => {
    mockGetByPath({
      questions: {
        items: [
          { ...questionA, id: "q-pending", status: "pending_review", statement_preview: "Pergunta em revisão" },
          { ...questionA, id: "q-archived", status: "archived", statement_preview: "Pergunta arquivada" },
        ],
        page: 1,
        page_size: 20,
        total: 2,
      },
    })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Pergunta em revisão")
    await screen.findByText("Pergunta arquivada")

    const [pendingActions, archivedActions] = screen.getAllByRole("button", { name: "Ações" })
    for (const trigger of [pendingActions, archivedActions]) {
      await user.click(trigger)
      expect(await screen.findByText("Ver histórico")).toBeInTheDocument()
      expect(screen.queryByText("Editar")).not.toBeInTheDocument()
      expect(screen.queryByText("Enviar para revisão")).not.toBeInTheDocument()
      expect(screen.queryByText("Excluir")).not.toBeInTheDocument()
      await user.keyboard("{Escape}")
    }
  })

  it("Ver histórico navega para /parceiro/perguntas/:id", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })

    renderPartnerQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))
    const link = await screen.findByRole("menuitem", { name: "Ver histórico" })
    expect(link).toHaveAttribute("href", "/parceiro/perguntas/question-1")
  })
})
