import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { PlansPage } from "@/pages/subscription/plans-page"
import { apiClient } from "@/lib/api/client"
import type { Plan } from "@/features/subscription/subscription-api"

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

function errorResponse(code: string, message: string, status = 422) {
  return {
    data: undefined,
    error: { error: { code, message, request_id: "req_test" } },
    response: new Response(null, { status }),
  }
}

const PLANS: Plan[] = [
  { slug: "monthly", name: "Mensal", duration_days: 30, pix_price: 2990, card_price: 3289, max_installments: 3 },
  { slug: "quarterly", name: "Trimestral", duration_days: 90, pix_price: 7990, card_price: 8789, max_installments: 3 },
]

function renderPlansPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/planos"]}>
        <Routes>
          <Route path="/planos" element={<PlansPage />} />
          <Route path="/assinatura/pagamento/:paymentId" element={<div data-testid="payment-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/plans") return Promise.resolve(jsonResponse({ items: PLANS }))
    return Promise.resolve(errorResponse("not_found", "not mocked", 404))
  })
})

describe("PlansPage", () => {
  it("lista os planos com preço PIX e cartão", async () => {
    renderPlansPage()

    expect(await screen.findByText("Mensal")).toBeInTheDocument()
    expect(screen.getByText(/R\$ 29,90 no PIX/)).toBeInTheDocument()
    expect(screen.getByText("Trimestral")).toBeInTheDocument()
  })

  it("checkout PIX bem-sucedido chama POST /me/checkout e navega para o pagamento", async () => {
    mockedApiClient.POST.mockResolvedValue(
      jsonResponse(
        {
          method: "pix",
          payment_id: "pay-1",
          qr_code_base64: "abc123",
          qr_code_text: "00020126...",
          expires_at: "2026-08-28T13:00:00.000Z",
          gross_amount: 2990,
          discount_amount: 0,
          net_amount: 2990,
          coupon_applied: false,
        },
        201,
      ),
    )

    renderPlansPage()
    const user = userEvent.setup()

    await user.click(await screen.findByText("Mensal"))
    await user.click(await screen.findByRole("button", { name: "Pagar com PIX" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/me/checkout",
        expect.objectContaining({ body: { plan_slug: "monthly", method: "pix" } }),
      ),
    )
    expect(await screen.findByTestId("payment-route")).toBeInTheDocument()
  })

  it("mostra mensagem específica quando já há checkout pendente (429)", async () => {
    mockedApiClient.POST.mockResolvedValue(
      errorResponse("too_many_pending_checkouts", "Checkouts pendentes demais", 429),
    )

    renderPlansPage()
    const user = userEvent.setup()

    await user.click(await screen.findByText("Mensal"))
    await user.click(await screen.findByRole("button", { name: "Pagar com PIX" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Você já tem um pagamento em andamento. Aguarde a confirmação antes de tentar de novo.",
      ),
    )
  })

  it("cartão fica desabilitado quando não há chave pública do Mercado Pago configurada", async () => {
    renderPlansPage()
    const user = userEvent.setup()

    await user.click(await screen.findByText("Mensal"))
    await user.click(screen.getByText("Cartão de crédito"))

    expect(await screen.findByText("Pagamento por cartão indisponível no momento. Use o PIX.")).toBeInTheDocument()
  })
})
