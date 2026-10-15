import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { HomePage } from "@/pages/home-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function ok<T>(data: T) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) }
}

function fail(status = 500) {
  return {
    data: undefined,
    error: { error: { code: "internal", message: "erro", request_id: "req_test" } },
    response: new Response(null, { status }),
  }
}

const USER = {
  id: "u1",
  name: "Ana Souza",
  email: "ana@example.com",
  phone: "62999998888",
  dob: null,
  sex: null,
  avatar_url: null,
  email_verified_at: "2026-01-01T00:00:00.000Z",
  role: "client",
  status: "active",
  consent_version: 1,
  trial_used_at: null,
  last_login_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
}

const SUBSCRIPTION_ACTIVE = {
  access_status: "active",
  active_until: "2999-01-01T00:00:00.000Z",
  source: "subscription",
  current_subscription: { id: "s1", plan_name: "Mensal", start_at: "2026-10-01T00:00:00.000Z", end_at: "2026-10-31T00:00:00.000Z", remaining_days: 20 },
  pending_payments: [],
  refund_eligible_payments: [],
}

const PERFORMANCE_EMPTY = {
  overall: { total_answers: 0, correct_answers: 0, accuracy: 0, quizzes_finished: 0 },
  by_axis: [],
  weakest_subjects: [],
  strongest_subjects: [],
  stats_reset_at: null,
}

const FISICA = {
  subject_id: "sub-fisica",
  subject_name: "Física",
  total: 20,
  correct: 8,
  accuracy: 0.4,
  last_answered_at: "2026-10-10T00:00:00.000Z",
  status_badge: "fraco",
}

const PERFORMANCE_WITH_DATA = {
  overall: { total_answers: 40, correct_answers: 26, accuracy: 0.65, quizzes_finished: 3 },
  by_axis: [{ axis_id: "ax1", axis_name: "Ciências", total: 40, correct: 26, accuracy: 0.65, subjects: [FISICA] }],
  weakest_subjects: [FISICA],
  strongest_subjects: [],
  stats_reset_at: null,
}

const LAST_QUIZ = {
  id: "quiz-9",
  mode: "free_subject",
  scope_name: "Física",
  status: "finished",
  started_at: "2026-10-10T10:00:00.000Z",
  finished_at: "2026-10-10T10:20:00.000Z",
  total_questions: 10,
  correct_count: 4,
  accuracy: 0.4,
}

function page<T>(items: T[]) {
  return { items, page: 1, page_size: items.length || 1, total: items.length }
}

function renderHome({
  performance = PERFORMANCE_EMPTY as unknown,
  history = [] as unknown[],
  subscription = SUBSCRIPTION_ACTIVE as unknown,
  performanceFails = false,
} = {}) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/me") return Promise.resolve(ok({ user: USER, requires_consent_renewal: false }))
    if (path === "/me/subscription") return Promise.resolve(ok(subscription))
    if (path === "/me/performance") return Promise.resolve(performanceFails ? fail() : ok(performance))
    if (path === "/me/quizzes") return Promise.resolve(ok(page(history)))
    if (path === "/subjects") return Promise.resolve(ok({ items: [], page: 1, page_size: 100, total: 5 }))
    return Promise.resolve(fail(404))
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/inicio"]}>
        <Routes>
          <Route path="/inicio" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** A pose pelo arquivo: o mascote do herói é decorativo (`alt=""`), sem nome acessível. */
function heroMascotSrc(container: HTMLElement) {
  return container.querySelector("section img")?.getAttribute("src") ?? null
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("HomePage", () => {
  it("recebe quem nunca fez quiz com o convite, sem uma faixa de zeros", async () => {
    // Act
    const { container } = renderHome()

    // Assert
    expect(await screen.findByRole("heading", { level: 1, name: "Olá, Ana!" })).toBeInTheDocument()
    await waitFor(() => expect(heroMascotSrc(container)).toContain("bq_welcome"))
    expect(screen.getByRole("link", { name: "Iniciar quiz" })).toHaveAttribute("href", "/quiz/iniciar")
    expect(screen.queryByText("Aproveitamento")).not.toBeInTheDocument()
  })

  it("mostra números, a matéria mais fraca para treinar e o último quiz", async () => {
    // Act
    const { container } = renderHome({ performance: PERFORMANCE_WITH_DATA, history: [LAST_QUIZ] })

    // Assert
    expect(await screen.findByText("Aproveitamento")).toBeInTheDocument()
    expect(screen.getByText("65%")).toBeInTheDocument()
    expect(await screen.findByText("1/5")).toBeInTheDocument()
    expect(screen.getByText("40% de acerto")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Treinar esta matéria" })).toHaveAttribute(
      "href",
      "/quiz/iniciar?modo=free_subject&materia=sub-fisica",
    )
    expect(screen.getByRole("link", { name: /Física/ })).toHaveAttribute("href", "/quiz/quiz-9/resultado")
    // Último quiz abaixo do corte de "forte": o mascote encoraja em vez de comemorar.
    await waitFor(() => expect(heroMascotSrc(container)).toContain("bq_encouraging"))
  })

  /**
   * Desempenho é complemento; o convite é o propósito da tela. Uma falha em
   * `/me/performance` não pode levar o botão junto.
   */
  it("continua oferecendo o quiz quando o desempenho não carrega", async () => {
    // Act
    renderHome({ performanceFails: true })

    // Assert
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument()
    await waitFor(() => expect(mockedApiClient.GET).toHaveBeenCalledWith("/me/performance"))
    expect(screen.getByRole("link", { name: "Iniciar quiz" })).toBeInTheDocument()
  })

  it("com acesso bloqueado, o botão principal leva aos planos", async () => {
    // Act
    renderHome({ subscription: { ...SUBSCRIPTION_ACTIVE, access_status: "inactive", current_subscription: null } })

    // Assert
    expect(await screen.findByRole("link", { name: "Assinar um plano" })).toHaveAttribute("href", "/planos")
    expect(screen.queryByRole("link", { name: "Iniciar quiz" })).not.toBeInTheDocument()
    // Um aviso só, no herói — e não um convite a treinar ao lado de um "assine".
    expect(screen.getAllByText(/acesso ao quiz está bloqueado/)).toHaveLength(1)
  })
})
