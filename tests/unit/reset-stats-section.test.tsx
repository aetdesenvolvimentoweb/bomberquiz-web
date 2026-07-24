import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { ResetStatsSection } from "@/pages/quiz/reset-stats-section"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { POST: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { POST: ReturnType<typeof vi.fn> }

function jsonResponse<T>(data: T, status = 200) {
  return { data, error: undefined, response: new Response(null, { status }) }
}

function renderResetStatsSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ResetStatsSection />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedApiClient.POST.mockReset()
})

describe("ResetStatsSection", () => {
  it("bloqueia o submit sem marcar o checkbox de confirmação", async () => {
    renderResetStatsSection()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Zerar estatísticas" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Senha"), "SenhaForte9x8y7z")
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }))

    expect(await within(dialog).findByText("Confirme que entende que esta ação é irreversível")).toBeInTheDocument()
    expect(mockedApiClient.POST).not.toHaveBeenCalled()
  })

  it("com senha e confirmação corretas, zera as estatísticas e mostra toast de sucesso", async () => {
    mockedApiClient.POST.mockResolvedValue(jsonResponse({}))

    renderResetStatsSection()
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Zerar estatísticas" }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText("Senha"), "SenhaForte9x8y7z")
    await user.click(within(dialog).getByRole("checkbox"))
    await user.click(within(dialog).getByRole("button", { name: "Confirmar" }))

    await waitFor(() =>
      expect(mockedApiClient.POST).toHaveBeenCalledWith(
        "/me/performance/reset",
        expect.objectContaining({ body: { password: "SenhaForte9x8y7z", confirm: true } }),
      ),
    )
    expect(toast.success).toHaveBeenCalledWith("Estatísticas zeradas.")
  })
})
