import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { PaymentsHistoryPage } from "@/pages/subscription/payments-history-page"
import { apiClient } from "@/lib/api/client"
import type { Payment } from "@/features/subscription/subscription-api"

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

function errorResponse(code: string, message: string, status = 409) {
  return {
    data: undefined,
    error: { error: { code, message, request_id: "req_test" } },
    response: new Response(null, { status }),
  }
}

function buildPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    plan_name: "Mensal",
    method: "pix",
    installments: 1,
    gross_amount: 2990,
    discount_amount: 0,
    net_amount: 2990,
    status: "paid",
    created_at: "2026-08-20T12:00:00.000Z",
    paid_at: "2026-08-20T12:05:00.000Z",
    refunded_at: null,
    failure_reason: null,
    mp_payment_id: "mp-1",
    mp_receipt_url: "https://mercadopago.com/receipt/mp-1",
    refund_deadline: "2026-08-27T12:05:00.000Z",
    refundable: true,
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/assinatura/pagamentos"]}>
        <PaymentsHistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.POST.mockReset()
})

describe("PaymentsHistoryPage", () => {
  it("lista os pagamentos com comprovante e botão de reembolso quando elegível", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [buildPayment()], page: 1, page_size: 20, total: 1 }))

    renderPage()

    expect(await screen.findByText("Mensal")).toBeInTheDocument()
    expect(screen.getByText("Pago", { selector: "div" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver comprovante" })).toHaveAttribute(
      "href",
      "https://mercadopago.com/receipt/mp-1",
    )
    expect(screen.getByRole("button", { name: "Solicitar reembolso" })).toBeInTheDocument()
  })

  it("não mostra o botão de reembolso quando o pagamento não é elegível", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ items: [buildPayment({ refundable: false })], page: 1, page_size: 20, total: 1 }),
    )

    renderPage()

    await screen.findByText("Mensal")
    expect(screen.queryByRole("button", { name: "Solicitar reembolso" })).not.toBeInTheDocument()
  })

  it("mostra estado vazio quando não há pagamentos", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [], page: 1, page_size: 20, total: 0 }))

    renderPage()

    expect(await screen.findByText("Nenhum pagamento encontrado.")).toBeInTheDocument()
  })

  it("confirma o reembolso pelo AlertDialog e chama POST .../refund", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [buildPayment()], page: 1, page_size: 20, total: 1 }))
    mockedApiClient.POST.mockResolvedValue(
      jsonResponse({ id: "pay-1", status: "refunded", refunded_at: "2026-08-28T00:00:00.000Z", net_amount: 2990, subscription_revoked: true }),
    )

    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Solicitar reembolso" }))
    await user.click(await screen.findByRole("button", { name: "Confirmar" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/me/payments/{id}/refund",
        expect.objectContaining({ params: { path: { id: "pay-1" } } }),
      ),
    )
    expect(toast.success).toHaveBeenCalledWith(
      "Reembolso confirmado.",
      expect.objectContaining({ description: expect.stringContaining("poucos minutos") }),
    )
  })

  // O cliente estornou um cartão, foi procurar o dinheiro no banco e não achou
  // — porque o prazo só era mencionado no e-mail, depois do fato (2026-08-28).
  // O aviso tem que estar na tela em que ele decide.
  it("mostra o prazo de devolução do cartão antes de confirmar o reembolso", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({ items: [buildPayment({ method: "card" })], page: 1, page_size: 20, total: 1 }),
    )

    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Solicitar reembolso" }))

    expect(await screen.findByText(/pode chegar a 10 dias úteis/)).toBeInTheDocument()
    expect(screen.getByText(/Você receberá de volta R\$\s?29,90 do plano Mensal/)).toBeInTheDocument()
  })

  it("mostra o prazo de devolução do PIX, que é diferente do cartão", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [buildPayment()], page: 1, page_size: 20, total: 1 }))

    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Solicitar reembolso" }))

    expect(await screen.findByText(/normalmente em poucos minutos/)).toBeInTheDocument()
    expect(screen.queryByText(/10 dias úteis/)).not.toBeInTheDocument()
  })

  it("explica na linha do histórico que o crédito de um reembolso ainda está a caminho", async () => {
    mockedApiClient.GET.mockResolvedValue(
      jsonResponse({
        items: [buildPayment({ method: "card", status: "refunded", refundable: false })],
        page: 1,
        page_size: 20,
        total: 1,
      }),
    )

    renderPage()

    expect(await screen.findByText("Reembolsado", { selector: "div" })).toBeInTheDocument()
    expect(screen.getByText("Crédito na fatura em até 10 dias úteis.")).toBeInTheDocument()
  })

  it("mostra mensagem específica quando a janela de reembolso expirou", async () => {
    mockedApiClient.GET.mockResolvedValue(jsonResponse({ items: [buildPayment()], page: 1, page_size: 20, total: 1 }))
    mockedApiClient.POST.mockResolvedValue(errorResponse("refund_window_expired", "Prazo expirado"))

    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole("button", { name: "Solicitar reembolso" }))
    await user.click(await screen.findByRole("button", { name: "Confirmar" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("O prazo de 7 dias para reembolso já passou."),
    )
  })
})
