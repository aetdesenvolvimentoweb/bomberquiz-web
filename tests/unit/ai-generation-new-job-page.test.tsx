import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AiGenerationNewJobPage } from "@/pages/admin/ai-generation-new-job-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

const subjectA = {
  id: "subject-1",
  axis_id: "axis-1",
  axis_name: "Salvamento",
  name: "Primeiros Socorros",
  official_source: null,
  status: "active" as const,
  questions_count: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  archived_at: null,
}

function renderNewJobPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/painel/geracao-ia/novo"]}>
        <Routes>
          <Route path="/painel/geracao-ia/novo" element={<AiGenerationNewJobPage />} />
          <Route path="/painel/geracao-ia/:jobId" element={<div data-testid="job-detail-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function pdfFile(name: string) {
  return new File(["%PDF-1.4 conteúdo de teste"], name, { type: "application/pdf" })
}

beforeEach(() => {
  mockedApiClient.GET.mockReset()
  mockedApiClient.GET.mockResolvedValue({
    data: { items: [subjectA], page: 1, page_size: 100, total: 1 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  })
  vi.stubGlobal("fetch", vi.fn())
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function fillFormExceptFiles(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox"))
  await user.click(await screen.findByRole("option", { name: "Salvamento — Primeiros Socorros" }))
}

describe("AiGenerationNewJobPage", () => {
  it("bloqueia o envio quando os 2 PDFs não foram selecionados", async () => {
    renderNewJobPage()
    const user = userEvent.setup()

    await fillFormExceptFiles(user)
    await user.click(screen.getByRole("button", { name: "Iniciar geração" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Selecione os dois arquivos PDF (prova de referência e material de estudo).",
      ),
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("cria o job com sucesso (multipart) e navega para o detalhe", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ job_id: "job-1", status: "pending", queue_position: 0, estimated_wait_seconds: 0 }),
        { status: 202 },
      ),
    )

    renderNewJobPage()
    const user = userEvent.setup()

    await fillFormExceptFiles(user)
    await user.upload(screen.getByLabelText("Prova de referência (PDF)"), pdfFile("prova.pdf"))
    await user.upload(screen.getByLabelText("Material de estudo (PDF)"), pdfFile("material.pdf"))
    await user.click(screen.getByRole("button", { name: "Iniciar geração" }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain("/admin/ai-generation/jobs")
    expect(init.method).toBe("POST")
    const body = init.body as FormData
    expect(body.get("subject_id")).toBe("subject-1")
    expect(body.get("question_count")).toBe("10")
    expect((body.get("reference_pdf") as File).name).toBe("prova.pdf")
    expect((body.get("material_pdf") as File).name).toBe("material.pdf")

    expect(await screen.findByTestId("job-detail-route")).toBeInTheDocument()
  })

  it("mostra o erro do servidor via toast quando a criação falha", async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "daily_job_limit_exceeded", message: "Limite diário atingido.", request_id: "req_test" } }),
        { status: 429 },
      ),
    )

    renderNewJobPage()
    const user = userEvent.setup()

    await fillFormExceptFiles(user)
    await user.upload(screen.getByLabelText("Prova de referência (PDF)"), pdfFile("prova.pdf"))
    await user.upload(screen.getByLabelText("Material de estudo (PDF)"), pdfFile("material.pdf"))
    await user.click(screen.getByRole("button", { name: "Iniciar geração" }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Limite diário atingido."))
  })

  it("rejeita um arquivo que não seja PDF antes mesmo do envio", async () => {
    renderNewJobPage()

    // userEvent.upload() respeita o atributo `accept` (filtra como um seletor
    // de arquivo real faria) — para exercitar a validação do próprio
    // componente com um tipo não permitido, disparamos o evento nativo direto.
    const input = screen.getByLabelText("Prova de referência (PDF)") as HTMLInputElement
    const notPdf = new File(["conteúdo"], "prova.txt", { type: "text/plain" })
    Object.defineProperty(input, "files", { value: [notPdf] })
    fireEvent.change(input)

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Envie um arquivo PDF."))
    expect(screen.queryByText("prova.txt")).not.toBeInTheDocument()
  })
})
