import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ReactElement } from "react"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password-page"
import { ResendVerificationPage } from "@/pages/auth/resend-verification-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { POST: ReturnType<typeof vi.fn> }

const RATE_LIMIT_MESSAGE = "Muitas solicitações para este e-mail. Aguarde um pouco antes de tentar de novo."

function renderPage(page: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

async function submit(buttonName: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("E-mail"), "maria@example.com")
  await user.click(screen.getByRole("button", { name: buttonName }))
}

beforeEach(() => {
  mockedApiClient.POST.mockReset()
  vi.mocked(toast.error).mockReset()
  mockedApiClient.POST.mockResolvedValue({
    data: undefined,
    error: {
      error: { code: "rate_limit_exceeded", message: "Muitas requisições.", request_id: "r" },
    },
    response: new Response(null, { status: 429 }),
  })
})

describe("limite por e-mail (AUTH-RF-009 CA-3)", () => {
  it("recuperação de senha: 429 avisa para aguardar, sem mostrar 'e-mail enviado'", async () => {
    renderPage(<ForgotPasswordPage />)

    await submit("Enviar link de recuperação")

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(RATE_LIMIT_MESSAGE))
    expect(screen.queryByText("Verifique seu e-mail")).not.toBeInTheDocument()
  })

  it("reenvio de verificação: 429 avisa para aguardar", async () => {
    renderPage(<ResendVerificationPage />)

    await submit("Reenviar e-mail")

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(RATE_LIMIT_MESSAGE))
  })
})
