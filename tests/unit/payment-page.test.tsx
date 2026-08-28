import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PaymentPage } from "@/pages/subscription/payment-page"
import { apiClient } from "@/lib/api/client"
import type { CheckoutResponse, MySubscriptionResponse } from "@/features/subscription/subscription-api"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn(), POST: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

const PIX_CHECKOUT: CheckoutResponse = {
  method: "pix",
  payment_id: "pay-1",
  qr_code_base64: "abc123",
  qr_code_text: "00020126...",
  expires_at: "2999-01-01T00:00:00.000Z",
  gross_amount: 2990,
  discount_amount: 0,
  net_amount: 2990,
  coupon_applied: false,
}

function buildSubscription(overrides: Partial<MySubscriptionResponse> = {}): MySubscriptionResponse {
  return {
    access_status: "inactive",
    active_until: null,
    source: null,
    current_subscription: null,
    pending_payments: [{ id: "pay-1", plan_name: "Mensal", method: "pix", amount: 2990, expires_at: "2999-01-01T00:00:00.000Z" }],
    refund_eligible_payments: [],
    ...overrides,
  }
}

function renderPaymentPage(state: { checkout?: CheckoutResponse } | null = { checkout: PIX_CHECKOUT }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/assinatura/pagamento/pay-1", state }]}>
        <Routes>
          <Route path="/assinatura/pagamento/:paymentId" element={<PaymentPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
})

describe("PaymentPage", () => {
  it("mostra o QR code e o código copia-e-cola enquanto o pagamento PIX está pendente", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(buildSubscription()))

    renderPaymentPage()

    expect(await screen.findByText("Aguardando confirmação")).toBeInTheDocument()
    expect(screen.getByAltText("QR Code PIX")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copiar código PIX" })).toBeInTheDocument()
  })

  it("mostra confirmação quando o pagamento sai de pendente e o acesso fica ativo", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse(
        buildSubscription({
          access_status: "active",
          pending_payments: [],
          current_subscription: { id: "sub-1", plan_name: "Mensal", start_at: "2026-08-28T00:00:00.000Z", end_at: "2026-09-27T00:00:00.000Z", remaining_days: 30 },
        }),
      ),
    )

    renderPaymentPage()

    expect(await screen.findByText("Pagamento confirmado")).toBeInTheDocument()
  })

  it("mostra falha quando o pagamento sai de pendente e o acesso continua inativo", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse(buildSubscription({ pending_payments: [] })))

    renderPaymentPage()

    expect(await screen.findByText("Pagamento não confirmado")).toBeInTheDocument()
  })
})
