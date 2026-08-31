import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { IndexRedirectPage } from "@/pages/index-redirect-page"
import { apiClient } from "@/lib/api/client"

vi.mock("@/lib/api/client", () => ({
  apiClient: { GET: vi.fn() },
}))

const mockedApiClient = apiClient as unknown as { GET: ReturnType<typeof vi.fn> }

function ok<T>(data: T) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) }
}

const PLANOS = {
  items: [
    {
      slug: "monthly",
      name: "Mensal",
      duration_days: 30,
      pix_price: 2990,
      card_price: 3289,
      max_installments: 1,
    },
    {
      slug: "annual",
      name: "Anual",
      duration_days: 365,
      pix_price: 29900,
      card_price: 32890,
      max_installments: 12,
    },
  ],
}

/**
 * Renderiza pela `IndexRedirectPage`, não pela `VitrinePage` direto: o que
 * importa provar é que a **raiz** atende os dois públicos — e é aí que mora o
 * risco de alguém deslogado ver o app, ou de alguém logado cair na página de
 * venda toda vez que abrir o PWA.
 */
function renderRaiz({ logado, planos = PLANOS }: { logado: boolean; planos?: unknown }) {
  mockedApiClient.GET.mockImplementation((path: string) => {
    if (path === "/plans") return Promise.resolve(ok(planos))
    if (logado) {
      return Promise.resolve(ok({ user: { id: "u1", name: "Ana", role: "client" }, requires_consent_renewal: false }))
    }
    return Promise.resolve({
      data: undefined,
      error: { error: { code: "unauthenticated" } },
      response: new Response(null, { status: 401 }),
    })
  })

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<IndexRedirectPage />} />
          <Route path="/inicio" element={<div>Tela inicial do app</div>} />
          <Route path="/cadastro" element={<div>Cadastro</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/**
 * Os CTAs pelo DESTINO, nunca pelo texto. O que estes testes garantem é que a
 * vitrine oferece caminho para o cadastro — a redação do botão é copy, existe
 * para ser reescrita, e prendê-la fazia um ajuste de texto quebrar quatro
 * asserções de uma vez.
 *
 * São dois na vitrine: o do herói e o do pé da seção de planos. `queryAll…`, e
 * não `getAll…`, porque este helper também serve para provar AUSÊNCIA — na tela
 * de quem já tem sessão não há link nenhum, e o `getAll…` lançaria em vez de
 * devolver lista vazia.
 */
function ctasDeCadastro(): HTMLElement[] {
  return screen.queryAllByRole("link").filter((l) => l.getAttribute("href") === "/cadastro")
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Vitrine em / (visitante sem sessão)", () => {
  /**
   * Verifica que existe um título e um caminho para o cadastro, não QUAL é o
   * texto: a copy da vitrine é para ser mexida, e um teste que prende a frase
   * exata quebra a cada ajuste sem apontar defeito nenhum.
   */
  it("mostra a vitrine em vez de mandar para o login", async () => {
    // Act
    renderRaiz({ logado: false })

    // Assert
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument()
    expect(ctasDeCadastro().length).toBeGreaterThan(0)
  })

  /**
   * O ponto que faz a fatia 1 e esta conversarem: preço em texto fixo aqui
   * significaria reajustar no painel e a vitrine continuar anunciando o antigo.
   */
  it("mostra os preços vindos da API, não escritos na página", async () => {
    // Act
    renderRaiz({ logado: false })

    // Assert
    expect(await screen.findByText("R$ 29,90")).toBeInTheDocument()
    expect(screen.getByText("R$ 299,00")).toBeInTheDocument()
    expect(screen.getByText(/R\$ 32,89 no cartão/)).toBeInTheDocument()
  })

  it("mostra o valor por mês nos planos longos, para dar comparação", async () => {
    // Act
    renderRaiz({ logado: false })

    // Assert — 29900 / 12 meses
    expect(await screen.findByText("R$ 24,92 por mês")).toBeInTheDocument()
    // O mensal não repete a mesma informação.
    expect(screen.queryByText("R$ 29,90 por mês")).not.toBeInTheDocument()
  })

  it("oferece o cadastro no topo e no pé da seção de planos", async () => {
    // Act
    renderRaiz({ logado: false })

    // Assert — dois pontos de entrada: quem se convence pelo título e quem só
    // se convence depois de ver o preço não deveriam ter de rolar de volta.
    await screen.findByRole("heading", { level: 1 })
    expect(ctasDeCadastro()).toHaveLength(2)
  })

  it("mantém o convite para entrar, para quem já é cliente", async () => {
    // Act
    renderRaiz({ logado: false })

    // Assert
    expect(await screen.findByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login")
  })

  /**
   * Se o catálogo falhar, o teste grátis continua valendo — ele não depende de
   * plano nenhum. Esconder o CTA junto transformaria um problema de catálogo em
   * porta fechada.
   */
  it("continua oferecendo o teste grátis quando os planos não carregam", async () => {
    // Act
    renderRaiz({ logado: false, planos: { items: [] } })

    // Assert
    expect(await screen.findByText(/teste grátis/i)).toBeInTheDocument()
    expect(ctasDeCadastro().length).toBeGreaterThan(0)
  })

  /**
   * O selo é promessa comercial: sai da comparação com o mensal, calculada da
   * mesma API. Escrito à mão, sobreviveria a um reajuste que o desfizesse e a
   * página anunciaria uma promoção inexistente.
   */
  it("destaca quanto o plano longo economiza por mês", async () => {
    // Act — anual R$299,00 (R$24,92/mês) contra mensal R$29,90
    renderRaiz({ logado: false });

    // Assert — 1 − 2492/2990 = 16,6% → truncado para 16
    expect(await screen.findByText("16% OFF")).toBeInTheDocument();
  });

  it("não põe selo no próprio mensal, que é a régua", async () => {
    // Act
    renderRaiz({ logado: false });

    // Assert
    await screen.findByText("R$ 29,90");
    const cardMensal = screen.getByText("Mensal").closest("li")!;
    expect(cardMensal.textContent).not.toContain("OFF");
  });

  /**
   * Sem plano mensal ativo não há régua — o admin pode tê-lo desativado. Um
   * percentual sobre base inventada seria pior que nenhum selo.
   */
  it("não anuncia desconto quando não há mensal para comparar", async () => {
    // Arrange
    const semMensal = { items: [PLANOS.items[1]] };

    // Act
    renderRaiz({ logado: false, planos: semMensal });

    // Assert
    expect(await screen.findByText("R$ 299,00")).toBeInTheDocument();
    expect(screen.queryByText(/OFF/)).not.toBeInTheDocument();
  });

  /**
   * Configuração de preço em que o plano longo sai mais caro por mês existe —
   * basta o admin reajustar só o mensal para baixo. Não há o que comemorar, e
   * um "-5% OFF" seria constrangedor.
   */
  it("não anuncia desconto quando o plano longo sai mais caro por mês", async () => {
    // Arrange — anual a R$299,00 (R$24,92/mês) com mensal a R$19,90
    const mensalBarato = {
      items: [{ ...PLANOS.items[0]!, pix_price: 1990 }, PLANOS.items[1]],
    };

    // Act
    renderRaiz({ logado: false, planos: mensalBarato });

    // Assert
    expect(await screen.findByText("R$ 19,90")).toBeInTheDocument();
    expect(screen.queryByText(/OFF/)).not.toBeInTheDocument();
  });

  /**
   * Verifica a DECISÃO, não a frase. O fecho dos passos é um `<p>` e não um
   * heading de propósito: em HTML um título anuncia o que vem DEPOIS dele, e
   * quem navega por títulos num leitor de tela aterrissaria nele e cairia
   * direto nos planos (ver o comentário em `vitrine-page.tsx`).
   *
   * A âncora são os `<h3>` dos cards — estrutura, não texto de venda. A versão
   * anterior deste teste exigia a frase literal e quebrou o CI no primeiro
   * ajuste de copy, sem apontar defeito nenhum.
   */
  it("fecha os três passos com uma frase, e não com um título falso", async () => {
    // Act
    renderRaiz({ logado: false });

    // Assert
    const passos = await screen.findAllByRole("heading", { level: 3 });
    const fecho = passos[0]!.closest("section")!.lastElementChild!;
    expect(fecho.tagName).toBe("P");
    expect(fecho.textContent?.trim()).not.toBe("");
  });

  it("leva a termos e privacidade no rodapé", async () => {
    // Act
    renderRaiz({ logado: false })

    // Assert
    expect(await screen.findByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade")
  })
})

describe("Vitrine em / (quem já tem sessão)", () => {
  it("vai direto para o app, sem passar pela página de venda", async () => {
    // Act
    renderRaiz({ logado: true })

    // Assert
    expect(await screen.findByText("Tela inicial do app")).toBeInTheDocument()
    await waitFor(() => {
      // Pelo CTA, não pelo título: é o elemento que só existe na página de
      // venda e cuja presença aqui seria o defeito de verdade.
      expect(ctasDeCadastro()).toHaveLength(0)
    })
  })
})
