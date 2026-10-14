import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { RouteErrorBoundary } from "@/components/route-error-boundary"

vi.mock("@/lib/monitoring/sentry", () => ({
  captureException: vi.fn(),
}))

function Explode(): never {
  throw new Error("falha de render")
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: "/", element: <div>Início</div> },
          { path: "/quebra", element: <Explode /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

describe("RouteErrorBoundary", () => {
  it("endereço inexistente mostra 'página não encontrada' com o mascote perdido", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    renderAt("/nao-existe")

    expect(await screen.findByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /mapa/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Voltar ao início" })).toBeInTheDocument()
  })

  it("falha de render continua como erro genérico, não como 404", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    renderAt("/quebra")

    expect(await screen.findByRole("heading", { name: "Ops, algo deu errado" })).toBeInTheDocument()
    expect(screen.getByText("Algo deu errado. Tente recarregar a página.")).toBeInTheDocument()
  })
})
