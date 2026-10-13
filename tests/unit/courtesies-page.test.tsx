import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { CourtesiesPage } from "@/pages/admin/courtesies-page"
import { apiClient } from "@/lib/api/client"
import type { AdminCourtesy, CourtesiesPage as CourtesiesPageData } from "@/features/courtesies/courtesies-admin-api"
import type { AdminUser } from "@/features/users/users-admin-api"

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

function errorResponse(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return {
    data: undefined,
    error: { error: { code, message, details, request_id: "req-1" } },
    response: new Response(null, { status }),
  }
}

function buildCourtesy(overrides: Partial<AdminCourtesy> = {}): AdminCourtesy {
  return {
    id: "c-1",
    beneficiary_user_id: "user-1",
    beneficiary_name: "Carla Lima",
    beneficiary_email: "carla@example.com",
    days_granted: 30,
    category: "parceria",
    notes: null,
    granted_by_admin_id: "admin-1",
    granted_by_admin_name: "Admin Um",
    status: "active",
    start_at: "2026-10-01T12:00:00.000Z",
    end_at: "2026-10-31T12:00:00.000Z",
    revoked_at: null,
    revocation_reason: null,
    created_at: "2026-10-01T12:00:00.000Z",
    ...overrides,
  }
}

const beneficiary: AdminUser = {
  id: "user-9",
  name: "Bruno Souza",
  email: "bruno@example.com",
  role: "partner",
  status: "active",
  created_at: "2026-08-01T12:00:00.000Z",
  last_login_at: null,
}

function renderPage(items: AdminCourtesy[], extra: Partial<CourtesiesPageData> = {}) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/users") return Promise.resolve(jsonResponse({ items: [beneficiary], page: 1, page_size: 1, total: 1 }))
    return Promise.resolve(
      jsonResponse({
        items,
        page: 1,
        page_size: 20,
        total: items.length,
        remaining_for_month: 7,
        resets_at: "2026-11-01T03:00:00.000Z",
        ...extra,
      }),
    )
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/cortesias"]}>
        <CourtesiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
})

describe("CourtesiesPage (SUB-RF-008 a 010)", () => {
  it("lista as cortesias com saldo do mês e só oferece revogar as ativas", async () => {
    renderPage([
      buildCourtesy({ id: "a", beneficiary_name: "Ativa Um" }),
      buildCourtesy({ id: "e", beneficiary_name: "Encerrada Um", status: "expired" }),
    ])

    expect(await screen.findByText("Ativa Um")).toBeInTheDocument()
    expect(screen.getByText("Encerrada Um")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Revogar" })).toHaveLength(1)
    expect(screen.getByText("Você ainda pode conceder 7 de 10 este mês")).toBeInTheDocument()
  })

  it("desabilita a concessão quando o limite do mês acabou", async () => {
    renderPage([], { remaining_for_month: 0 })

    expect(await screen.findByText(/Limite do mês atingido · renova em 01\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Conceder cortesia" })).toBeDisabled()
  })

  it("concede depois de achar o usuário pelo e-mail", async () => {
    renderPage([])
    mockedApiClient.POST.mockResolvedValue(
      jsonResponse({
        id: "new",
        beneficiary_user_id: beneficiary.id,
        days_granted: 45,
        category: "demonstracao",
        start_at: "2026-10-13T12:00:00.000Z",
        end_at: "2026-11-27T12:00:00.000Z",
      }, 201),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Conceder cortesia" }))
    const submit = screen.getByRole("button", { name: "Conceder" })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText("E-mail do usuário"), "bruno@example.com")
    expect(await screen.findByText("Bruno Souza · conta ativa")).toBeInTheDocument()
    await user.clear(screen.getByLabelText("Dias (1 a 365)"))
    await user.type(screen.getByLabelText("Dias (1 a 365)"), "45")
    await user.selectOptions(within(screen.getByRole("dialog")).getByLabelText("Categoria"), "demonstracao")
    await user.type(screen.getByLabelText("Observações (opcional)"), "Divulgação")
    await user.click(submit)

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith("/admin/courtesies", {
        body: { beneficiary_user_id: "user-9", days_granted: 45, category: "demonstracao", notes: "Divulgação" },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Cortesia concedida a Bruno Souza, válida até 27/11/2026.")
  })

  it("explica quando renova o limite se a API recusar com 429", async () => {
    renderPage([])
    mockedApiClient.POST.mockResolvedValue(
      errorResponse(429, "courtesy_monthly_limit", "Limite", { remaining_for_month: 0, resets_at: "2026-11-01T03:00:00.000Z" }),
    )
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Conceder cortesia" }))
    await user.type(screen.getByLabelText("E-mail do usuário"), "bruno@example.com")
    await screen.findByText("Bruno Souza · conta ativa")
    await user.click(screen.getByRole("button", { name: "Conceder" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Você já concedeu 10 cortesias este mês. O limite renova em 01/11/2026."),
    )
  })

  it("revoga só com motivo de pelo menos 10 caracteres", async () => {
    renderPage([buildCourtesy()])
    mockedApiClient.POST.mockResolvedValue(jsonResponse(undefined, 204))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Revogar" }))
    await screen.findByText("Revogar cortesia?")
    const confirm = screen.getAllByRole("button", { name: "Revogar" }).at(-1)!
    await user.type(screen.getByLabelText(/Motivo/), "curto")
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText(/Motivo/), " demais não")
    await user.click(confirm)

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith("/admin/courtesies/{id}/revoke", {
        params: { path: { id: "c-1" } },
        body: { reason: "curto demais não" },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Cortesia de Carla Lima revogada.")
  })
})
