import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { LoginPage } from "@/pages/auth/login-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Ver mesmo comentário em axes-page.test.tsx sobre o tipo genérico do openapi-fetch.
const mockedApiClient = apiClient as unknown as { POST: ReturnType<typeof vi.fn> }

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function submitLoginForm() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("E-mail"), "bombeiro@example.com")
  await user.type(screen.getByLabelText("Senha"), "senha-qualquer")
  await user.click(screen.getByRole("button", { name: /entrar/i }))
}

beforeEach(() => {
  mockedApiClient.POST.mockReset()
})

describe("LoginPage", () => {
  it("mostra erro de validação ao enviar o formulário vazio", async () => {
    renderLoginPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /entrar/i }))

    expect(await screen.findByText(/e-mail inválido/i)).toBeInTheDocument()
  })

  it("mostra a mensagem de erro real do backend para uma resposta de falha sem corpo (regressão)", async () => {
    // Regressão: openapi-fetch devolve `{ error: undefined, response }` para
    // respostas não-2xx com corpo vazio (ex.: 401/403/429 do login, sem JSON
    // documentado no schema). unwrap() precisa tratar isso como falha mesmo
    // assim — antes disso, esse caso silenciosamente virava um TypeError não
    // relacionado ao motivo real, mascarado sob "Não foi possível entrar."
    mockedApiClient.POST.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 401 }),
    })

    renderLoginPage()
    await submitLoginForm()

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // Corpo vazio -> ApiError cai no fallback genérico dela mesma, não mais no
    // fallback duplicado da página (que só deve ser alcançado por um erro que
    // nem é ApiError, ver teste seguinte).
    expect(toast.error).toHaveBeenCalledWith("Erro inesperado. Tente novamente.")
  })

  it("não trata uma resposta 2xx sem `user` como login bem-sucedido", async () => {
    mockedApiClient.POST.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 200 }),
    })

    renderLoginPage()
    await submitLoginForm()

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível entrar."))
  })
})
