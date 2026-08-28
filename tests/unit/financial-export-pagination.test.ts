import { describe, expect, it, vi, beforeEach } from "vitest"
import { fetchAllAdminPayments } from "@/features/subscription/financial-api"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function pagina(quantidade: number, total: number) {
  return {
    data: {
      items: Array.from({ length: quantidade }, (_, i) => ({ id: `pay-${i}` })),
      page: 1,
      page_size: 100,
      total,
    },
    error: undefined,
    response: new Response(null, { status: 200 }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * A exportação percorre o endpoint paginado até esgotar. É o único laço não
 * limitado da tela: errar a condição de parada trava o navegador do admin, e
 * isso não aparece em nenhum teste de componente — a tabela mostra só 20 linhas
 * e nunca exercita a segunda volta.
 */
describe("fetchAllAdminPayments", () => {
  it("percorre todas as páginas até completar o total", async () => {
    // Arrange
    mockedApiClient.GET
      .mockResolvedValueOnce(pagina(100, 250))
      .mockResolvedValueOnce(pagina(100, 250))
      .mockResolvedValueOnce(pagina(50, 250))

    // Act
    const todas = await fetchAllAdminPayments({ from: "2026-04-01", to: "2026-04-30" })

    // Assert
    expect(todas).toHaveLength(250)
    expect(mockedApiClient.GET).toHaveBeenCalledTimes(3)
    expect(mockedApiClient.GET.mock.calls[2]![1].params.query.page).toBe(3)
  })

  it("faz uma requisição só quando tudo cabe na primeira página", async () => {
    // Arrange
    mockedApiClient.GET.mockResolvedValue(pagina(12, 12))

    // Act
    const todas = await fetchAllAdminPayments({})

    // Assert
    expect(todas).toHaveLength(12)
    expect(mockedApiClient.GET).toHaveBeenCalledTimes(1)
  })

  /**
   * O caso que trava: um total que não bate com o que chega — alguém estornando
   * ao mesmo tempo, ou um filtro que muda o total entre requisições. A página
   * vazia encerra o laço mesmo assim.
   */
  it("para numa página vazia em vez de girar para sempre", async () => {
    // Arrange
    mockedApiClient.GET
      .mockResolvedValueOnce(pagina(100, 999))
      .mockResolvedValueOnce(pagina(0, 999))

    // Act
    const todas = await fetchAllAdminPayments({})

    // Assert
    expect(todas).toHaveLength(100)
    expect(mockedApiClient.GET).toHaveBeenCalledTimes(2)
  })

  it("leva o período e os filtros da tela para todas as páginas", async () => {
    // Arrange
    mockedApiClient.GET.mockResolvedValueOnce(pagina(100, 150)).mockResolvedValueOnce(pagina(50, 150))

    // Act
    await fetchAllAdminPayments({ from: "2026-04-01", to: "2026-04-30", status: "paid", search: "joão" })

    // Assert
    for (const chamada of mockedApiClient.GET.mock.calls) {
      expect(chamada[1].params.query).toMatchObject({
        from: "2026-04-01",
        to: "2026-04-30",
        status: "paid",
        search: "joão",
      })
    }
  })
})
