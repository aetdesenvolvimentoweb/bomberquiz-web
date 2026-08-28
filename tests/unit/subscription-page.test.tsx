import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SubscriptionPage } from "@/pages/subscription/subscription-page"
import { apiClient } from "@/lib/api/client"
import type { MySubscriptionResponse } from "@/features/subscription/subscription-api"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

function buildSubscription(overrides: Partial<MySubscriptionResponse> = {}): MySubscriptionResponse {
  return {
    access_status: "active",
    active_until: "2026-09-27T00:00:00.000Z",
    source: "paid",
    current_subscription: {
      id: "sub-1",
      plan_name: "Mensal",
      start_at: "2026-08-28T00:00:00.000Z",
      end_at: "2026-09-27T00:00:00.000Z",
      remaining_days: 30,
    },
    pending_payments: [],
    refund_eligible_payments: [],
    ...overrides,
  }
}

function renderSubscriptionPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/assinatura"]}>
        <SubscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("SubscriptionPage", () => {
  it("mostra o plano ativo, a origem e os dias restantes", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(buildSubscription()))

    renderSubscriptionPage()

    expect(await screen.findByText("Mensal")).toBeInTheDocument()
    expect(screen.getByText("Ativa")).toBeInTheDocument()
    expect(screen.getByText("Assinatura paga")).toBeInTheDocument()
    expect(screen.getByText(/restam 30 dias/)).toBeInTheDocument()
  })

  it("mostra aviso de bloqueio e CTA de assinar quando inativo", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse(buildSubscription({ access_status: "inactive", source: null, current_subscription: null, cta: "subscribe" })),
    )

    renderSubscriptionPage()

    expect(await screen.findByText("Inativa")).toBeInTheDocument()
    expect(screen.getByText(/acesso ao quiz está bloqueado/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Assinar agora" })).toHaveAttribute("href", "/planos")
  })

  it("lista pagamentos pendentes com link para continuar o pagamento", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse(
        buildSubscription({
          pending_payments: [{ id: "pay-1", plan_name: "Mensal", method: "pix", amount: 2990, expires_at: "2999-01-01T00:00:00.000Z" }],
        }),
      ),
    )

    renderSubscriptionPage()

    expect(await screen.findByRole("link", { name: "Continuar pagamento" })).toHaveAttribute(
      "href",
      "/assinatura/pagamento/pay-1",
    )
  })
})
