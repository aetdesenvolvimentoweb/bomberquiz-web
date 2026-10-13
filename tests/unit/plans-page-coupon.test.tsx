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

// O Brick real precisa do SDK do Mercado Pago; aqui só importa o valor que ele recebe.
vi.mock("@/features/subscription/card-payment-section", () => ({
  CardPaymentSection: ({ amountInCents }: { amountInCents: number }) => (
    <p data-testid="card-amount">{amountInCents}</p>
  ),
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
]

const PIX_CHECKOUT = {
  method: "pix",
  payment_id: "pay-1",
  qr_code_base64: "abc",
  qr_code_text: "000201",
  expires_at: "2026-10-13T13:00:00.000Z",
  gross_amount: 2990,
  discount_amount: 299,
  net_amount: 2691,
  coupon_applied: true,
}

/** Prévia: 10% sobre o preço do método pedido. */
function mockPreview(valid = true) {
  mockedApiClient.POST.mockImplementation((path: string, init: { body: { method: string } }) => {
    if (path === "/me/checkout/coupon-preview") {
      if (!valid) return Promise.resolve(jsonResponse({ valid: false }))
      const gross = init.body.method === "card" ? 3289 : 2990
      const discount = Math.round(gross / 10)
      return Promise.resolve(
        jsonResponse({ valid: true, gross_amount: gross, discount_amount: discount, net_amount: gross - discount }),
      )
    }
    return Promise.resolve(jsonResponse(PIX_CHECKOUT, 201))
  })
}

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

async function applyCoupon(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.click(await screen.findByText("Mensal"))
  await user.type(screen.getByLabelText("Cupom de desconto"), code)
  await user.click(screen.getByRole("button", { name: "Aplicar" }))
}

function normalized(text: string | null | undefined) {
  return (text ?? "").replace(/ /g, " ")
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
  vi.mocked(toast.error).mockReset()
  mockedApiClient.GET.mockImplementation(() => Promise.resolve(jsonResponse({ items: PLANS })))
})

describe("PlansPage — cupom (SUB-RF-003 CA-3)", () => {
  it("aplicar mostra o preço riscado e o PIX vai com o cupom", async () => {
    mockPreview()
    renderPlansPage()
    const user = userEvent.setup()

    await applyCoupon(user, "bombeiro10")

    expect(normalized((await screen.findByText(/aplicado:/)).textContent)).toContain("BOMBEIRO10 aplicado: R$ 2,99 de desconto")
    expect(normalized(screen.getByText("R$ 29,90", { exact: false, selector: ".line-through" }).textContent)).toBe("R$ 29,90")

    await user.click(screen.getByRole("button", { name: "Pagar com PIX" }))
    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith("/me/checkout", {
        body: { plan_slug: "monthly", method: "pix", coupon_code: "bombeiro10" },
      }),
    )
  })

  it("no cartão, o formulário recebe o total com desconto sobre o preço do cartão", async () => {
    mockPreview()
    renderPlansPage()
    const user = userEvent.setup()

    await applyCoupon(user, "bombeiro10")
    await screen.findByText(/aplicado:/)
    await user.click(screen.getByText("Cartão de crédito"))

    // 3289 - 329 = 2960: a troca de método refaz a conferência com o preço do cartão.
    await waitFor(() => expect(screen.getByTestId("card-amount").textContent).toBe("2960"))
  })

  it("cupom recusado na prévia avisa e não muda o preço", async () => {
    mockPreview(false)
    renderPlansPage()
    const user = userEvent.setup()

    await applyCoupon(user, "naoexiste")

    expect(await screen.findByText("Cupom inválido ou expirado.")).toBeInTheDocument()
    expect(screen.queryByText(/aplicado:/)).not.toBeInTheDocument()
  })

  it("cupom que expirou entre a prévia e o pagamento: avisa e tira o cupom", async () => {
    mockPreview()
    renderPlansPage()
    const user = userEvent.setup()
    await applyCoupon(user, "bombeiro10")
    await screen.findByText(/aplicado:/)
    mockedApiClient.POST.mockResolvedValueOnce(errorResponse("coupon_invalid", "Cupom inválido ou expirado"))

    await user.click(screen.getByRole("button", { name: "Pagar com PIX" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Cupom inválido ou expirado. O pagamento não foi feito; tente de novo sem ele.",
      ),
    )
    expect(screen.queryByText(/aplicado:/)).not.toBeInTheDocument()
    expect(screen.getByText("Cupom inválido ou expirado.")).toBeInTheDocument()
  })
})
