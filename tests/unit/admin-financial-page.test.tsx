import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AdminFinancialPage } from "@/pages/admin/financial-page"
import { apiClient } from "@/lib/api/client"
import type { AdminPayment, FinancialOverview } from "@/features/subscription/financial-api"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) }
}

function buildOverview(overrides: Partial<FinancialOverview["revenue"]> = {}): FinancialOverview {
  return {
    period: { from: "2026-04-01T00:00:00.000Z", to: "2026-04-30T23:59:59.999Z" },
    revenue: {
      total_cents: 12000,
      count: 4,
      by_plan: [{ plan_slug: "monthly", plan_name: "Mensal", count: 4, total_cents: 12000 }],
      by_method: [{ method: "pix", count: 4, total_cents: 12000 }],
      refunded_cents: 2990,
      refunded_count: 1,
      fee_cents: 600,
      received_cents: 11400,
      fee_unknown_count: 0,
      ...overrides,
    },
    users: { active_paid: 42, in_trial: 18 },
  }
}

function buildPayment(overrides: Partial<AdminPayment> = {}): AdminPayment {
  return {
    id: "pay-1",
    user_id: "user-1",
    user_name: "João Silva",
    user_email: "joao@example.com",
    plan_slug: "monthly",
    plan_name: "Mensal",
    method: "pix",
    status: "paid",
    installments: 1,
    net_amount: 2990,
    fee_amount: 149,
    received_amount: 2841,
    mp_legacy_payment_id: "176036687788",
    created_at: "2026-04-10T15:00:00.000Z",
    paid_at: "2026-04-10T15:00:00.000Z",
    refunded_at: null,
    ...overrides,
  }
}

/**
 * A página dispara duas consultas diferentes no mesmo `GET`; o roteamento por
 * path é o que permite variar uma sem mexer na outra.
 */
function renderPage(overview = buildOverview(), payments: AdminPayment[] = [buildPayment()]) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/admin/financial/overview") return Promise.resolve(jsonResponse(overview))
    return Promise.resolve(jsonResponse({ items: payments, page: 1, page_size: 20, total: payments.length }))
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminFinancialPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * Valor grande de um card, achado a partir do título. `getAllByText` porque
 * títulos como "Estornado" também aparecem como opção do filtro de status — o
 * card é o único cujo bloco contém o valor em destaque. E o `replace` troca o
 * espaço rígido que o `Intl` insere depois de "R$" (U+00A0) por um espaço
 * comum: são idênticos na tela e diferentes na comparação.
 */
function cardValue(titulo: string): string {
  const bloco = screen
    .getAllByText(titulo)
    .map((el) => el.parentElement!)
    .find((pai) => pai.querySelector(".text-2xl"))!
  return bloco.querySelector(".text-2xl")!.textContent!.replace(/\u00a0/g, " ")
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AdminFinancialPage (SUB-RF-012)", () => {
  it("mostra cobrado, estornado, taxa e líquido em reais", async () => {
    // Act
    renderPage()
    await screen.findByText("Cobrado dos clientes")

    // Assert — ancorado no card, porque o mesmo valor também aparece nos
    // agrupamentos por plano e por método; buscar o texto solto acharia vários.
    expect(cardValue("Cobrado dos clientes")).toBe("R$ 120,00")
    expect(cardValue("Estornado")).toBe("R$ 29,90")
    expect(cardValue("Taxas do Mercado Pago")).toBe("R$ 6,00")
    expect(cardValue("Recebido na conta")).toBe("R$ 114,00")
  })

  it("abre no mês corrente", async () => {
    // Act
    renderPage()

    // Assert
    const inicio = (await screen.findByLabelText("Início do período")) as HTMLInputElement
    expect(inicio.value.endsWith("-01")).toBe(true)
    const hoje = new Date()
    expect(inicio.value.slice(0, 7)).toBe(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`)
  })

  /**
   * O ponto mais importante da tela: um líquido incompleto que se apresenta como
   * fechado é pior do que não ter painel. Se este teste cair, alguém tirou o
   * aviso e o admin passou a ler um número inflado sem saber.
   */
  it("avisa quando há pagamentos sem taxa registrada", async () => {
    // Act
    renderPage(buildOverview({ fee_unknown_count: 3 }))

    // Assert
    expect(await screen.findByText(/3 pagamento\(s\) ainda sem taxa registrada/)).toBeInTheDocument()
    expect(screen.getByText(/Faltam 3 — valor incompleto/)).toBeInTheDocument()
  })

  it("não avisa nada quando todas as taxas são conhecidas", async () => {
    // Act
    renderPage()

    // Assert
    expect(await screen.findByText("Todas as compras conferidas")).toBeInTheDocument()
    expect(screen.queryByText(/ainda sem taxa registrada/)).not.toBeInTheDocument()
  })

  it("mostra travessão, e não R$ 0,00, para transação sem taxa conhecida", async () => {
    // Act
    renderPage(buildOverview(), [buildPayment({ fee_amount: null, received_amount: null })])

    // Assert
    await screen.findByText("João Silva")
    const linha = screen.getByText("João Silva").closest("tr")!
    expect(linha.textContent).toContain("—")
    expect(linha.textContent).not.toContain("R$ 0,00")
  })

  it("lista a transação com cliente, plano e valor", async () => {
    // Act
    renderPage()

    // Assert
    expect(await screen.findByText("João Silva")).toBeInTheDocument()
    expect(screen.getByText("joao@example.com")).toBeInTheDocument()
    expect(screen.getByText("R$ 28,41")).toBeInTheDocument()
  })

  it("envia o filtro de status escolhido para a API", async () => {
    // Arrange
    const user = userEvent.setup()
    renderPage()
    await screen.findByText("João Silva")

    // Act
    await user.selectOptions(screen.getByLabelText("Filtrar por status"), "refunded")

    // Assert
    await waitFor(() => {
      const chamada = mockedApiClient.GET.mock.calls.find(
        (c) => c[0] === "/admin/payments" && c[1]?.params?.query?.status === "refunded",
      )
      expect(chamada).toBeDefined()
    })
  })

  it("mostra a contagem de assinantes pagos e em teste", async () => {
    // Act
    renderPage()

    // Assert
    expect(await screen.findByText("42")).toBeInTheDocument()
    expect(screen.getByText("18")).toBeInTheDocument()
  })

  it("informa quando não há transação com os filtros aplicados", async () => {
    // Act
    renderPage(buildOverview(), [])

    // Assert
    expect(await screen.findByText("Nenhuma transação com esses filtros.")).toBeInTheDocument()
  })
})
