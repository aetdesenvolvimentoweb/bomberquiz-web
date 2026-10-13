import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { CouponsPage } from "@/pages/admin/coupons-page"
import { apiClient } from "@/lib/api/client"
import type { AdminCoupon } from "@/features/coupons/coupons-admin-api"
import type { Plan } from "@/features/subscription/subscription-api"

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

function errorResponse(status: number, code: string, message: string) {
  return {
    data: undefined,
    error: { error: { code, message, request_id: "req-1" } },
    response: new Response(null, { status }),
  }
}

const PLANS: Plan[] = [
  { slug: "monthly", name: "Mensal", duration_days: 30, pix_price: 2990, card_price: 3289, max_installments: 3 },
  { slug: "annual", name: "Anual", duration_days: 365, pix_price: 19990, card_price: 21989, max_installments: 3 },
]

function buildCoupon(overrides: Partial<AdminCoupon> = {}): AdminCoupon {
  return {
    id: "cp-1",
    code: "BOMBEIRO10",
    discount_type: "percent",
    discount_value: 10,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    used_count: 0,
    is_active: true,
    applies_to_plan_slugs: null,
    created_at: "2026-10-01T12:00:00.000Z",
    ...overrides,
  }
}

function renderPage(items: AdminCoupon[]) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/plans") return Promise.resolve(jsonResponse({ items: PLANS }))
    return Promise.resolve(jsonResponse({ items, page: 1, page_size: 20, total: items.length }))
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/cupons"]}>
        <CouponsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  mockedApiClient.PATCH.mockReset()
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
})

describe("CouponsPage (SUB-RF-013)", () => {
  it("lista desconto, validade, usos e planos de cada cupom", async () => {
    renderPage([
      buildCoupon(),
      buildCoupon({
        id: "cp-2",
        code: "ANUAL50",
        discount_type: "fixed_cents",
        discount_value: 5000,
        valid_until: "2026-11-01T02:59:59.999Z",
        max_uses: 20,
        used_count: 3,
        applies_to_plan_slugs: ["annual"],
        is_active: false,
      }),
    ])

    const anual = (await screen.findByText("ANUAL50")).closest("tr")!
    expect(within(anual).getByText(/R\$\s50,00/)).toBeInTheDocument()
    expect(within(anual).getByText("Até 31/10/2026")).toBeInTheDocument()
    expect(within(anual).getByText("3 de 20")).toBeInTheDocument()
    expect(await within(anual).findByText("Anual")).toBeInTheDocument()
    expect(within(anual).getByRole("button", { name: "Reativar" })).toBeInTheDocument()

    const bombeiro = screen.getByText("BOMBEIRO10").closest("tr")!
    expect(within(bombeiro).getByText("10%")).toBeInTheDocument()
    expect(within(bombeiro).getByText("Sem prazo")).toBeInTheDocument()
    expect(within(bombeiro).getByText("0 (sem limite)")).toBeInTheDocument()
    expect(within(bombeiro).getByText("Todos")).toBeInTheDocument()
  })

  it("cria cupom de valor fixo convertendo reais em centavos e datas em dias de Brasília", async () => {
    renderPage([])
    mockedApiClient.POST.mockResolvedValue(jsonResponse(buildCoupon({ code: "GOIAS15" }), 201))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Novo cupom" }))
    const dialog = await screen.findByRole("dialog")
    const submit = within(dialog).getByRole("button", { name: "Criar cupom" })
    expect(submit).toBeDisabled()

    await user.type(within(dialog).getByLabelText("Código"), "goias15")
    await user.selectOptions(within(dialog).getByLabelText("Tipo de desconto"), "fixed_cents")
    await user.type(within(dialog).getByLabelText("Valor (R$)"), "15,50")
    await user.type(within(dialog).getByLabelText("Válido a partir de (opcional)"), "2026-10-15")
    await user.type(within(dialog).getByLabelText("Válido até (opcional)"), "2026-10-31")
    await user.type(within(dialog).getByLabelText("Limite de usos (opcional)"), "100")
    await user.click(await within(dialog).findByLabelText("Mensal"))
    await user.click(submit)

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith("/admin/coupons", {
        body: {
          code: "GOIAS15",
          discount_type: "fixed_cents",
          discount_value: 1550,
          valid_from: "2026-10-15T00:00:00.000-03:00",
          valid_until: "2026-10-31T23:59:59.999-03:00",
          max_uses: 100,
          applies_to_plan_slugs: ["monthly"],
        },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Cupom GOIAS15 criado.")
  })

  it("mostra a mensagem da API quando o código já existe", async () => {
    renderPage([])
    mockedApiClient.POST.mockResolvedValue(errorResponse(409, "coupon_code_taken", "Já existe um cupom com o código DUPLO"))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Novo cupom" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Código"), "duplo")
    await user.type(within(dialog).getByLabelText("Percentual (1 a 100)"), "10")
    await user.click(within(dialog).getByRole("button", { name: "Criar cupom" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Já existe um cupom com o código DUPLO"))
  })

  it("edita o limite sem deixar baixar abaixo dos usos já feitos", async () => {
    renderPage([buildCoupon({ max_uses: 10, used_count: 4 })])
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse(buildCoupon({ max_uses: 50, used_count: 4 })))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Editar" }))
    const dialog = await screen.findByRole("dialog")
    const maxUses = within(dialog).getByLabelText("Limite de usos")
    const save = within(dialog).getByRole("button", { name: "Salvar" })

    await user.clear(maxUses)
    await user.type(maxUses, "3")
    expect(save).toBeDisabled()

    await user.clear(maxUses)
    await user.type(maxUses, "50")
    await user.click(save)

    await waitFor(() =>
      expect(mockedApiClient.PATCH).toHaveBeenCalledWith("/admin/coupons/{id}", {
        params: { path: { id: "cp-1" } },
        body: { valid_until: null, max_uses: 50 },
      }),
    )
  })

  it("desativa direto pela linha", async () => {
    renderPage([buildCoupon()])
    mockedApiClient.PATCH.mockResolvedValue(jsonResponse(buildCoupon({ is_active: false })))
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Desativar" }))

    await waitFor(() =>
      expect(mockedApiClient.PATCH).toHaveBeenCalledWith("/admin/coupons/{id}", {
        params: { path: { id: "cp-1" } },
        body: { is_active: false },
      }),
    )
    expect(toast.success).toHaveBeenCalledWith("Cupom BOMBEIRO10 desativado.")
  })
})
