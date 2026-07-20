import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { QuestionsPage } from "@/pages/admin/questions-page"
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

// Mesmo padrão de cast usado em axes-page.test.tsx/subjects-page.test.tsx.
const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
}

function renderQuestionsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/perguntas"]}>
        <QuestionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const axisA = {
  id: "axis-1",
  name: "Salvamento",
  description: null,
  tap_weight: 9,
  status: "active" as const,
  subjects_count: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

const subjectA = {
  id: "subject-1",
  axis_id: "axis-1",
  axis_name: "Salvamento",
  name: "Primeiros Socorros",
  official_source: null,
  status: "active" as const,
  questions_count: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

const questionA = {
  id: "question-1",
  subject_id: "subject-1",
  subject_name: "Primeiros Socorros",
  axis_name: "Salvamento",
  statement_preview: "Qual o procedimento correto para X?",
  status: "published" as const,
  author_id: "admin-1",
  author_name: "Admin Teste",
  has_image: false,
  created_at: "2026-01-01T00:00:00.000Z",
  published_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
  total_answers: 0,
  accuracy: 0,
}

function mockGetByPath(responses: { axes?: unknown; subjects?: unknown; questions?: unknown }) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/axes") {
      return Promise.resolve({
        data: responses.axes ?? { items: [axisA], page: 1, page_size: 100, total: 1 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    if (path === "/admin/subjects") {
      return Promise.resolve({
        data: responses.subjects ?? { items: [subjectA], page: 1, page_size: 100, total: 1 },
        error: undefined,
        response: new Response(null, { status: 200 }),
      })
    }
    if (path === "/admin/questions") {
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

describe("QuestionsPage", () => {
  it("lista as perguntas retornadas pela API", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })

    renderQuestionsPage()

    expect(await screen.findByText("Qual o procedimento correto para X?")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("Primeiros Socorros")).toBeInTheDocument()
    expect(within(screen.getByRole("table")).getByText("Publicada")).toBeInTheDocument()
  })

  it("cria uma nova pergunta publicada direto pelo diálogo", async () => {
    mockGetByPath({ questions: { items: [], page: 1, page_size: 20, total: 0 } })
    mockedApiClient.POST.mockResolvedValue({
      data: { ...questionA, subject_id: "subject-1" },
      error: undefined,
      response: new Response(null, { status: 201 }),
    })

    renderQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhuma pergunta encontrada.")
    await user.click(screen.getByRole("button", { name: "Nova pergunta" }))

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Salvamento — Primeiros Socorros" }))
    await user.type(within(dialog).getByLabelText("Enunciado"), "Qual o procedimento correto para X?")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 1"), "Alternativa A")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 2"), "Alternativa B")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 3"), "Alternativa C")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 4"), "Alternativa D")
    await user.type(within(dialog).getByLabelText("Justificativa"), "Porque a norma exige esse procedimento.")
    await user.click(within(dialog).getByRole("button", { name: "Publicar" }))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/admin/questions",
        expect.objectContaining({
          params: { query: { as_draft: false } },
          body: expect.objectContaining({ subject_id: "subject-1", correct_index: 0 }),
        }),
      ),
    )
  })

  it("arquiva uma pergunta pelo menu de ações", async () => {
    mockGetByPath({ questions: { items: [questionA], page: 1, page_size: 20, total: 1 } })
    mockedApiClient.POST.mockResolvedValue({
      data: { ...questionA, status: "archived", archived_at: "2026-01-02T00:00:00.000Z" },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Qual o procedimento correto para X?")
    await user.click(screen.getByRole("button", { name: "Ações" }))
    await user.click(await screen.findByText("Arquivar"))

    await waitFor(() =>
      expect(apiClient.POST).toHaveBeenCalledWith(
        "/admin/questions/{id}/archive",
        expect.objectContaining({ params: { path: { id: questionA.id } } }),
      ),
    )
  })

  it("mostra erro quando alternativas duplicadas são rejeitadas (422)", async () => {
    mockGetByPath({ questions: { items: [], page: 1, page_size: 20, total: 0 } })

    renderQuestionsPage()
    const user = userEvent.setup()

    await screen.findByText("Nenhuma pergunta encontrada.")
    await user.click(screen.getByRole("button", { name: "Nova pergunta" }))

    const dialog = await screen.findByRole("dialog")
    await user.click(within(dialog).getByRole("combobox"))
    await user.click(await screen.findByRole("option", { name: "Salvamento — Primeiros Socorros" }))
    await user.type(within(dialog).getByLabelText("Enunciado"), "Qual o procedimento correto para X?")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 1"), "Igual")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 2"), "Igual")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 3"), "Outra")
    await user.type(within(dialog).getByPlaceholderText("Alternativa 4"), "Mais uma")
    await user.type(within(dialog).getByLabelText("Justificativa"), "Porque a norma exige esse procedimento.")
    await user.click(within(dialog).getByRole("button", { name: "Publicar" }))

    expect(await within(dialog).findByText("Alternativas não podem ser duplicadas")).toBeInTheDocument()
    expect(apiClient.POST).not.toHaveBeenCalled()
  })
})
