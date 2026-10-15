import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { UserDetailPage } from "@/pages/admin/user-detail-page"
import { apiClient } from "@/lib/api/client"
import type { AdminUserDetail } from "@/features/users/users-admin-api"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  POST: ReturnType<typeof vi.fn>
  PATCH: ReturnType<typeof vi.fn>
}

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

function buildDetail(overrides: Partial<AdminUserDetail> = {}): AdminUserDetail {
  return {
    id: "u-1",
    name: "Maria Bombeira",
    email: "maria@example.com",
    role: "client",
    status: "active",
    created_at: "2026-08-01T12:00:00.000Z",
    last_login_at: "2026-10-12T12:00:00.000Z",
    avatar_url: null,
    contract: {
      access: { status: "active", active_until: "2026-10-20T17:00:00.000Z", source: "courtesy" },
      recent_subscriptions: [
        {
          id: "s-2",
          source: "courtesy",
          plan_name: null,
          status: "active",
          start_at: "2026-10-01T12:00:00.000Z",
          end_at: "2026-10-20T17:00:00.000Z",
          courtesy_category: "parceria",
        },
        {
          id: "s-1",
          source: "paid",
          plan_name: "Mensal",
          status: "expired",
          start_at: "2026-08-01T12:00:00.000Z",
          end_at: "2026-08-31T12:00:00.000Z",
          courtesy_category: null,
        },
      ],
      courtesies_received_this_year: 2,
    },
    content_reports: null,
    ...overrides,
  }
}

function renderPage(detail: AdminUserDetail | "not_found") {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/users/{id}") {
      if (detail === "not_found") {
        return Promise.resolve({
          data: undefined,
          error: { error: { code: "user_not_found", message: "Usuário não encontrado", request_id: "r" } },
          response: new Response(null, { status: 404 }),
        })
      }
      return Promise.resolve(jsonResponse(detail))
    }
    // Busca do diálogo de cortesia pelo e-mail.
    if (detail === "not_found") return Promise.resolve(jsonResponse({ items: [], page: 1, page_size: 1, total: 0 }))
    return Promise.resolve(jsonResponse({ items: [detail], page: 1, page_size: 1, total: 1 }))
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/usuarios/u-1"]}>
        <Routes>
          <Route path="/painel/usuarios/:id" element={<UserDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function normalized(text: string | null | undefined) {
  return (text ?? "").replace(/ /g, " ")
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("UserDetailPage (PROF-RF-014)", () => {
  it("mostra acesso, cortesias do ano e as últimas assinaturas", async () => {
    renderPage(buildDetail())

    expect(await screen.findByRole("heading", { name: "Maria Bombeira" })).toBeInTheDocument()
    expect(mockedApiClient.GET).toHaveBeenCalledWith("/admin/users/{id}", { params: { path: { id: "u-1" } } })
    expect(normalized(screen.getByText(/^Ativo até/).textContent)).toBe("Ativo até 20/10/2026 às 14h")
    expect(screen.getByText("2")).toBeInTheDocument()

    const rows = screen.getAllByRole("row").slice(1)
    expect(within(rows[0]!).getByText("Cortesia")).toBeInTheDocument()
    expect(within(rows[0]!).getByText("Parceria")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Paga")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Mensal")).toBeInTheDocument()
    expect(within(rows[1]!).getByText("Expirada")).toBeInTheDocument()
  })

  it("cliente ativo: oferece tornar parceiro e conceder cortesia com o e-mail já preenchido", async () => {
    renderPage(buildDetail())
    const user = userEvent.setup()

    expect(await screen.findByRole("button", { name: "Tornar parceiro" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Revogar parceiro" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Conceder cortesia" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText("E-mail do usuário")).toHaveValue("maria@example.com")
  })

  it("parceiro com conta inativa: só revogar, sem cortesia; sem acesso", async () => {
    renderPage(
      buildDetail({
        role: "partner",
        status: "inactive",
        contract: {
          access: { status: "inactive", active_until: null, source: null },
          recent_subscriptions: [],
          courtesies_received_this_year: 0,
        },
      }),
    )

    expect(await screen.findByRole("button", { name: "Revogar parceiro" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Tornar parceiro" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Conceder cortesia" })).not.toBeInTheDocument()
    expect(screen.getByText("Sem acesso")).toBeInTheDocument()
    expect(screen.getByText("Nenhuma assinatura.")).toBeInTheDocument()
  })

  it("404: avisa que o usuário não foi encontrado", async () => {
    renderPage("not_found")

    expect(await screen.findByText("Usuário não encontrado.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "← Usuários" })).toHaveAttribute("href", "/painel/usuarios")
  })
})
