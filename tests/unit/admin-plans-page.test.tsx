import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AdminPlansPage } from "@/pages/admin/plans-page"
import { apiClient } from "@/lib/api/client"
import type { AdminPlan } from "@/features/subscription/plans-admin-api"

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

function buildPlan(overrides: Partial<AdminPlan> = {}): AdminPlan {
  return {
    id: "plan-monthly",
    slug: "monthly",
    name: "Mensal",
    duration_days: 30,
    pix_price: 2990,
    card_price: 3289,
    max_installments: 3,
    is_active: true,
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderPage(plans: AdminPlan[] = [buildPlan()]) {
  mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: plans }))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/planos"]}>
        <AdminPlansPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function openEditor() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole("button", { name: "Editar" }))
  await screen.findByRole("dialog")
  return user
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.PATCH.mockReset()
  vi.mocked(toast.success).mockReset()
})

describe("AdminPlansPage (SUB-RF-001 CA-2)", () => {
  it("lista os planos com preços formatados em reais", async () => {
    renderPage()

    expect(await screen.findByText("Mensal")).toBeInTheDocument()
    expect(screen.getByText("R$ 29,90")).toBeInTheDocument()
    expect(screen.getByText("R$ 32,89")).toBeInTheDocument()
    expect(screen.getByText("À venda")).toBeInTheDocument()
  })

  // CA-4: plano desativado não some da tela do admin — é a única forma de
  // religá-lo. Some só do catálogo do cliente, que é outra rota.
  it("mostra o plano desativado, com o status explícito", async () => {
    renderPage([buildPlan({ is_active: false })])

    expect(await screen.findByText("Desativado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument()
  })

  // O campo do formulário é em REAIS; a API fala em CENTAVOS. Se essa conversão
  // escorregar, o admin vende por R$0,35 ou por R$3.490,00 sem a tela desconfiar.
  it("envia o preço digitado em reais convertido para centavos", async () => {
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse(buildPlan({ pix_price: 3490, card_price: 3839 })))
    renderPage()
    const user = await openEditor()

    const pixInput = screen.getByLabelText("Preço no PIX (R$)")
    await user.clear(pixInput)
    await user.type(pixInput, "34,90")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(mockedApiClient.PATCH).toHaveBeenCalledWith(
        "/admin/plans/{id}",
        expect.objectContaining({
          params: { path: { id: "plan-monthly" } },
          body: expect.objectContaining({ pix_price: 3490 }),
        }),
      ),
    )
  })

  it("sugere o preço de cartão como PIX + 10% enquanto o admin não o edita", async () => {
    renderPage()
    const user = await openEditor()

    const pixInput = screen.getByLabelText("Preço no PIX (R$)")
    await user.clear(pixInput)
    await user.type(pixInput, "40,00")

    expect(screen.getByLabelText("Preço no cartão (R$)")).toHaveValue("44,00")
  })

  // Sugerir é ajudar; sobrescrever é atrapalhar. Uma vez que o admin definiu o
  // preço de cartão, mexer no PIX não pode desfazer a escolha dele.
  it("para de sugerir depois que o admin define o preço de cartão à mão", async () => {
    renderPage()
    const user = await openEditor()

    const cardInput = screen.getByLabelText("Preço no cartão (R$)")
    await user.clear(cardInput)
    await user.type(cardInput, "35,00")

    const pixInput = screen.getByLabelText("Preço no PIX (R$)")
    await user.clear(pixInput)
    await user.type(pixInput, "40,00")

    expect(cardInput).toHaveValue("35,00")
  })

  it("barra cartão abaixo do PIX antes de chegar na API", async () => {
    renderPage()
    const user = await openEditor()

    const cardInput = screen.getByLabelText("Preço no cartão (R$)")
    await user.clear(cardInput)
    await user.type(cardInput, "10,00")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(await screen.findByText("O preço no cartão não pode ser menor que o do PIX")).toBeInTheDocument()
    expect(mockedApiClient.PATCH).not.toHaveBeenCalled()
  })

  it("barra preço abaixo do piso de R$ 1,00 do Mercado Pago", async () => {
    renderPage()
    const user = await openEditor()

    const pixInput = screen.getByLabelText("Preço no PIX (R$)")
    await user.clear(pixInput)
    await user.type(pixInput, "0,50")
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    // Dois erros, não um: a sugestão automática levou o cartão junto para
    // baixo do piso (0,50 → 0,55). Os dois campos acusam, e é o correto.
    expect(await screen.findAllByText("O preço mínimo é R$ 1,00")).toHaveLength(2)
    expect(mockedApiClient.PATCH).not.toHaveBeenCalled()
  })

  // Quem reajusta precisa saber, no ato, que não mexeu em nada já vendido —
  // senão a dúvida "e quem pagou ontem, foi cobrado a mais?" fica no ar.
  it("avisa no sucesso que compras anteriores mantêm o preço antigo", async () => {
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse(buildPlan({ pix_price: 3490 })))
    renderPage()
    const user = await openEditor()

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Plano Mensal atualizado.",
        expect.objectContaining({ description: expect.stringContaining("mantêm o preço antigo") }),
      ),
    )
  })
})
