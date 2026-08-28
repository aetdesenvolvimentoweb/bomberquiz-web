import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCentsToBRL } from "@/features/subscription/schemas";
import { usePlans, type Plan } from "@/features/subscription/subscription-api";
import { Link } from "react-router-dom";

/**
 * Página índice pública (Módulo 7, fatia 3). Quem chega em `/` sem sessão via
 * navegador vê isto em vez de cair direto no formulário de senha.
 *
 * **Os preços nunca aparecem em texto fixo.** Vêm de `GET /plans`, que é público
 * por SUB-RF-001 CA-1. Escrevê-los à mão aqui transformaria o admin de planos
 * (fatia 1) numa armadilha: o preço seria reajustado no painel e esta página
 * continuaria anunciando o antigo — mentindo para quem ainda nem é cliente.
 *
 * **CTA único: cadastro.** A assinatura acontece depois, já dentro do app, em
 * `/planos`. Levar a intenção de plano através do cadastro exigiria carregá-la
 * pelo link do e-mail de verificação (`requireEmailVerification` é obrigatório),
 * e o estado sobreviveria a um clique em outro dispositivo só por sorte.
 */
export function VitrinePage() {
  const { data, isPending } = usePlans();
  const plans = data?.items ?? [];

  // Régua do selo de desconto dos planos longos. Sai da própria lista da API —
  // se o admin desativar o mensal, não há com o que comparar e os selos somem,
  // que é preferível a anunciar percentual sobre base inventada.
  const mensalPixPrice =
    plans.find((p) => p.slug === "monthly")?.pix_price ?? null;

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        {/* O componente da marca, não uma cópia: eu tinha reescrito o logo à mão
            aqui e usado o token de cor errado — `text-primary` (azul quase
            preto) em vez de `text-ember`. Uma marca com duas grafias é a coisa
            que ninguém nota até estar nos dois lugares ao mesmo tempo. */}
        <Brand className="text-lg" />
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-4 pb-16">
        <section className="pt-8 text-center sm:pt-16">
          <h1 className="text-balance text-3xl font-bold sm:text-5xl">
            Preparação inteligente para o Teste de Avaliação Profissional
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground sm:text-lg">
            Você pratica, identifica o que precisa reforçar e chega mais
            confiante para a prova.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/cadastro">Experimente grátis por 7 dias</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Sem cartão para começar.
            </span>
          </div>
        </section>

        <section>
          <div className="grid gap-6 sm:grid-cols-3">
            <Passo
              numero="1"
              titulo="Escolha"
              texto="Defina o que quer treinar: selecione matérias específicas ou deixe o app montar um desafio completo com todos os eixos do TAP."
            />
            <Passo
              numero="2"
              titulo="Enfrente"
              texto="Responda às questões e confira o resultado. Cada acerto reforça sua confiança, e os erros viram aprendizado imediatamente."
            />
            <Passo
              numero="3"
              titulo="Evolua"
              texto="Acompanhe seu desempenho por matéria e descubra onde já está sólido e onde precisa investir mais tempo para chegar pronto ao TAP."
            />
          </div>

          {/* Fecho dos três passos — dentro da MESMA seção deles, de propósito.
              Solto entre as duas seções, o espaçamento de 64px acima e abaixo o
              deixava equidistante, e a frase passava a parecer um subtítulo de
              "Planos" em vez da conclusão dos passos. Proximidade é o que diz a
              quem a frase pertence.

              E é `<p>`, não `<h2>`: em HTML um título anuncia o que vem DEPOIS
              dele, e quem navega por títulos num leitor de tela aterrissaria
              aqui e cairia direto nos planos. Visualmente é um título;
              estruturalmente seria uma promessa falsa. */}
          <p className="mt-10 text-center text-2xl font-semibold sm:text-3xl">
            Dedicação que vira resultado
          </p>
        </section>

        <section id="planos" className="scroll-mt-8">
          <h2 className="text-center text-2xl font-semibold">Planos</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Depois dos 7 dias grátis, escolha o período que preferir.
          </p>

          {isPending && (
            <div className="mt-8 flex justify-center">
              <Spinner />
            </div>
          )}

          {!isPending && plans.length === 0 && (
            /*
              Sem preço, o botão continua valendo: os 7 dias grátis não dependem
              de plano nenhum. Esconder o CTA porque a lista de planos falhou
              seria transformar um problema de catálogo em porta fechada.
            */
            <p className="mt-8 text-center text-muted-foreground">
              Não foi possível carregar os planos agora. O teste grátis de 7
              dias continua disponível.
            </p>
          )}

          {plans.length > 0 && (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <PlanoCard
                  key={plan.slug}
                  plan={plan}
                  mensalPixPrice={mensalPixPrice}
                />
              ))}
            </ul>
          )}

          <div className="mt-10 text-center">
            <Button asChild size="lg">
              <Link to="/cadastro">Começar teste grátis</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>BomberQuiz</span>
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-foreground">
              Termos de uso
            </Link>
            <Link to="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Passo({
  numero,
  titulo,
  texto,
}: {
  numero: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="rounded-lg border p-5">
      {/* Número e título na mesma linha: empilhados, o círculo ocupava uma
          faixa inteira de altura só para se anunciar. `shrink-0` no círculo
          porque um título que quebre em duas linhas espremeria o número até
          virar oval. */}
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {numero}
        </span>
        <h3 className="font-medium">{titulo}</h3>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function PlanoCard({
  plan,
  mensalPixPrice,
}: {
  plan: Plan;
  mensalPixPrice: number | null;
}) {
  // Mesma conta que a tela de planos do cliente faz: o valor por mês é o que
  // torna comparáveis períodos de duração diferente.
  const meses = Math.max(1, Math.round(plan.duration_days / 30));
  const porMes = Math.round(plan.pix_price / meses);
  const desconto = descontoPercentual(porMes, mensalPixPrice);

  return (
    <li className="flex flex-col rounded-lg border p-5">
      <span className="font-medium">{plan.name}</span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {formatCentsToBRL(plan.pix_price)}
        </span>
        {desconto !== null && <Badge variant="success">{desconto}% OFF</Badge>}
      </div>
      <span className="text-sm text-muted-foreground">no PIX</span>
      {meses > 1 && (
        <span className="mt-1 text-xs text-muted-foreground">
          {formatCentsToBRL(porMes)} por mês
        </span>
      )}
      <span className="mt-3 text-xs text-muted-foreground">
        ou {formatCentsToBRL(plan.card_price)} no cartão
        {plan.max_installments > 1 && ` em até ${plan.max_installments}×`}
      </span>
    </li>
  );
}

/**
 * Quanto o plano economiza por mês em relação ao mensal, em pontos percentuais
 * inteiros. `null` quando não há desconto a anunciar.
 *
 * **Calculado, nunca escrito à mão** — mesma razão dos preços: um "30% OFF"
 * fixo continuaria na tela depois de um reajuste que o desfizesse, e a vitrine
 * estaria anunciando uma promoção inexistente para quem ainda nem é cliente.
 *
 * A base é o `porMes` **já arredondado** que o card exibe, e não o preço cheio:
 * assim o número do selo confere com a conta que o leitor faz de cabeça
 * (R$20,83 contra R$29,90 → ~30%). Derivar de bases diferentes daria divergência
 * de um ponto em alguns preços — pequena, e exatamente do tipo que faz alguém
 * desconfiar do resto da página.
 *
 * Trunca em vez de arredondar: anunciar 31% quando são 30,6% é exagerar o
 * desconto, e prefiro errar para menos no que é promessa comercial.
 */
function descontoPercentual(
  porMes: number,
  mensalPixPrice: number | null,
): number | null {
  // Sem plano mensal ativo não há régua de comparação — o admin pode tê-lo
  // desativado. Melhor nenhum selo do que um percentual sobre base inventada.
  if (mensalPixPrice === null || mensalPixPrice <= 0) return null;

  const percentual = Math.floor((1 - porMes / mensalPixPrice) * 100);
  // Cobre o próprio mensal (0%) e qualquer configuração de preço em que o plano
  // longo saia mais caro por mês — aí não há o que comemorar.
  return percentual >= 1 ? percentual : null;
}
