import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { UsersPage } from "@/pages/admin/users-page"
import { apiClient } from "@/lib/api/client"
import type { AdminUser } from "@/features/users/users-admin-api"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), PATCH: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as {
  GET: ReturnType<typeof vi.fn>
  PATCH: ReturnType<typeof vi.fn>
}

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: "user-1",
    name: "Carla Lima",
    email: "carla@example.com",
    role: "client",
    status: "active",
    created_at: "2026-08-01T12:00:00.000Z",
    last_login_at: null,
    ...overrides,
  }
}

function renderPage(users: AdminUser[]) {
  mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: users, page: 1, page_size: 20, total: users.length }))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/usuarios"]}>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.PATCH.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
})

describe("UsersPage (PROF-RF-011 a 013)", () => {
  it("mostra a ação certa para cada papel e nenhuma para admin ou cliente inativo", async () => {
    renderPage([
      buildUser({ id: "c", name: "Cliente Ativo" }),
      buildUser({ id: "i", name: "Cliente Inativo", status: "inactive" }),
      buildUser({ id: "p", name: "Parceiro Um", role: "partner" }),
      buildUser({ id: "a", name: "Admin Um", role: "admin" }),
    ])

    expect(await screen.findByText("Cliente Ativo")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Tornar parceiro" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Revogar parceiro" })).toHaveLength(1)
  })

  it("promove após confirmar no diálogo", async () => {
    renderPage([buildUser()])
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse(buildUser({ role: "partner" })))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Tornar parceiro" }))
    await screen.findByText("Tornar parceiro?")
    expect(mockedApiClient.PATCH).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Tornar parceiro" }))

    await waitFor(() =>
      expect(mockedApiClient.PATCH).toHaveBeenCalledWith("/admin/users/{id}/role", {
        params: { path: { id: "user-1" } },
        body: { role: "partner", reason: undefined },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Carla Lima agora é parceiro.")
  })

  it("revoga enviando o motivo informado", async () => {
    renderPage([buildUser({ role: "partner" })])
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse(buildUser({ role: "client" })))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Revogar parceiro" }))
    await user.type(await screen.findByLabelText("Motivo (opcional)"), "Fim da parceria")
    await user.click(screen.getByRole("button", { name: "Revogar" }))

    await waitFor(() =>
      expect(mockedApiClient.PATCH).toHaveBeenCalledWith("/admin/users/{id}/role", {
        params: { path: { id: "user-1" } },
        body: { role: "client", reason: "Fim da parceria" },
      }),
    )
  })

  it("repassa o filtro de papel para a API", async () => {
    renderPage([])
    const user = userEvent.setup()

    expect(await screen.findByText("Nenhum usuário encontrado.")).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText("Papel"), "partner")

    await waitFor(() =>
      expect(mockedApiClient.GET).toHaveBeenLastCalledWith("/admin/users", {
        params: { query: expect.objectContaining({ role: "partner", page: 1 }) },
      }),
    )
  })
})
