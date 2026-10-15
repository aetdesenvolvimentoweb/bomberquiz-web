import { Link } from "react-router-dom"
import { Mascot, type MascotPose } from "@/components/mascot"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSession } from "@/features/session/use-session"
import { useActiveSubjects } from "@/features/content/catalog-api"
import { usePerformance, useQuizHistory, type PerformanceResponse } from "@/features/quiz/performance-api"
import { useMySubscription } from "@/features/subscription/subscription-api"

// Aviso proativo de expiração: só faz sentido nos últimos dias, para não virar
// ruído visual o ciclo inteiro da assinatura.
const EXPIRY_WARNING_THRESHOLD_DAYS = 3

// A partir daqui o último quiz conta como "foi bem" e o mascote comemora; abaixo,
// ele encoraja. Mesmo corte do selo "forte" do painel de desempenho
// (`statusBadge` em api/src/application/quiz/get-performance.usecase.ts).
const GOOD_RESULT_ACCURACY = 0.75

const MODE_LABELS: Record<string, string> = {
  tap_simulation: "Simulado TAP",
  free_subject: "Livre por matéria",
  free_axis: "Livre por eixo",
}

type LastQuiz = {
  id: string
  mode: string
  scope_name: string | null
  finished_at: string | null
  started_at: string
  total_questions: number
  correct_count: number
  accuracy: number
}

/**
 * Tela inicial do cliente (`/inicio`). O foco é um só: começar um quiz. O resto
 * — números, sugestão de matéria, último resultado — existe para dar motivo e
 * direção a esse clique, e por isso nada aqui pode esconder o CTA: as consultas
 * de desempenho e histórico entram quando chegam e, se falharem, simplesmente
 * não aparecem.
 *
 * Perfil e sair ficam só no menu (`nav-shell`); repeti-los aqui competia com o
 * convite ao quiz.
 */
export function HomePage() {
  const { user } = useSession()
  const { data: subscription } = useMySubscription()
  const { data: performance, isPending: performancePending } = usePerformance()
  const { data: history, isPending: historyPending } = useQuizHistory({ page: 1, pageSize: 1 })
  const { data: activeSubjects } = useActiveSubjects()

  if (!user) return null

  const showExpiringSoonWarning =
    subscription?.access_status === "active" &&
    subscription.current_subscription !== null &&
    subscription.current_subscription.remaining_days <= EXPIRY_WARNING_THRESHOLD_DAYS

  const blocked = subscription?.access_status === "inactive"
  const lastQuiz: LastQuiz | undefined = history?.items[0]
  // Sem desempenho carregado (ou com erro) trata como novato: é o estado em que
  // o convite genérico continua fazendo sentido.
  const isNewcomer = !performance || performance.overall.quizzes_finished === 0
  // Pose e frase dependem das duas consultas. Decidir antes de ambas chegarem
  // mostrava a quem volta o convite de novato (ou a pose de comemoração) por um
  // instante e depois trocava — então, até lá, frase neutra e lugar reservado.
  const settled = !performancePending && !historyPending

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      {showExpiringSoonWarning && subscription?.current_subscription && (
        <Card className="w-full border-primary bg-primary/5 text-left">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm">
              Sua assinatura vence em {subscription.current_subscription.remaining_days}{" "}
              {subscription.current_subscription.remaining_days === 1 ? "dia" : "dias"}.
            </p>
            <Button asChild size="sm">
              <Link to="/planos">Renovar</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Hero
        firstName={user.name.split(" ")[0] ?? user.name}
        pose={settled ? heroPose(isNewcomer, lastQuiz) : null}
        message={
          // Bloqueado, o próprio herói dá o recado: uma faixa vermelha à parte
          // dizia "assine" enquanto o herói logo abaixo convidava a treinar.
          blocked
            ? "Seu acesso ao quiz está bloqueado. Assine um plano para voltar a treinar."
            : settled
              ? heroMessage(isNewcomer, lastQuiz)
              : "Pronto para treinar para o TAP?"
        }
        blocked={blocked}
      />

      {performance && !isNewcomer && (
        <>
          <StatsStrip performance={performance} totalSubjects={activeSubjects?.total} />
          <TrainingSuggestion performance={performance} totalSubjects={activeSubjects?.total} blocked={blocked} />
        </>
      )}

      {lastQuiz && <LastQuizRow quiz={lastQuiz} />}
    </div>
  )
}

function heroPose(isNewcomer: boolean, lastQuiz: LastQuiz | undefined): MascotPose {
  if (isNewcomer) return "welcome"
  if (lastQuiz && lastQuiz.accuracy < GOOD_RESULT_ACCURACY) return "encouraging"
  return "happy"
}

function heroMessage(isNewcomer: boolean, lastQuiz: LastQuiz | undefined): string {
  if (isNewcomer) return "Vamos começar? Um quiz de 10 questões leva poucos minutos."
  if (!lastQuiz) return "Pronto para mais um treino?"
  return lastQuiz.accuracy >= GOOD_RESULT_ACCURACY
    ? "Mandou bem no último quiz. Bora manter o ritmo?"
    : "Cada erro de hoje é um acerto na prova. Bora mais um?"
}

function Hero({
  firstName,
  pose,
  message,
  blocked,
}: {
  firstName: string
  pose: MascotPose | null
  message: string
  blocked: boolean
}) {
  return (
    <section className="flex flex-col items-center gap-6 rounded-xl border bg-card p-6 text-center sm:flex-row-reverse sm:justify-between sm:p-8 sm:text-left">
      {/* Enquanto o desempenho carrega, só reserva o lugar: trocar de pose
          depois (welcome → happy) faria o mascote "piscar" para quem volta.
          A proporção é a dos arquivos (400×646). */}
      {pose ? (
        <Mascot pose={pose} alt="" priority className="w-[110px] sm:w-[150px]" />
      ) : (
        <div aria-hidden className="aspect-[400/646] w-[110px] shrink-0 sm:w-[150px]" />
      )}
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Olá, {firstName}!</h1>
        <p className="mt-2 text-balance text-muted-foreground">{message}</p>
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
          {blocked ? <Link to="/planos">Assinar um plano</Link> : <Link to="/quiz/iniciar">Iniciar quiz</Link>}
        </Button>
      </div>
    </section>
  )
}

function StatsStrip({ performance, totalSubjects }: { performance: PerformanceResponse; totalSubjects?: number }) {
  const { overall, by_axis } = performance
  const studied = by_axis.flatMap((axis) => axis.subjects).length

  return (
    <section aria-labelledby="home-stats-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-stats-title" className="font-medium">
          Seu desempenho
        </h2>
        <Link to="/desempenho" className="text-sm text-primary hover:underline">
          Ver completo
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat value={String(overall.total_answers)} label="Perguntas respondidas" />
        <Stat value={`${Math.round(overall.accuracy * 100)}%`} label="Aproveitamento" />
        <Stat
          value={typeof totalSubjects === "number" ? `${studied}/${totalSubjects}` : String(studied)}
          label="Matérias estudadas"
        />
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * A matéria mais fraca, com atalho para treiná-la. Sem nenhuma matéria com
 * respostas suficientes para ser avaliada (o painel exige 10), sugere cobrir as
 * que faltam; com tudo coberto e nada fraco, não há o que sugerir e o cartão some.
 */
function TrainingSuggestion({
  performance,
  totalSubjects,
  blocked,
}: {
  performance: PerformanceResponse
  totalSubjects?: number
  blocked: boolean
}) {
  if (blocked) return null

  const weakest = performance.weakest_subjects[0]
  const studied = performance.by_axis.flatMap((axis) => axis.subjects).length
  const missing = typeof totalSubjects === "number" ? totalSubjects - studied : 0

  if (weakest) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Convite, matéria e número em linhas próprias: numa frase só, nomes
              longos ("… - CBMGO") se misturavam ao "Reforce" e ao percentual. */}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Sugestão de treino · reforce esta matéria</p>
            <p className="mt-1 font-medium">{weakest.subject_name}</p>
            <Badge variant={weakest.status_badge === "fraco" ? "destructive" : "outline"} className="mt-2">
              {Math.round(weakest.accuracy * 100)}% de acerto
            </Badge>
          </div>
          <Button asChild variant="outline">
            <Link to={`/quiz/iniciar?modo=free_subject&materia=${encodeURIComponent(weakest.subject_id)}`}>
              Treinar esta matéria
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (missing > 0) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Sugestão de treino</p>
            <p className="font-medium">
              {missing === 1 ? "Falta 1 matéria" : `Faltam ${missing} matérias`} para você conhecer. O simulado TAP passa
              por todos os eixos.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/quiz/iniciar">Fazer simulado</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}

function LastQuizRow({ quiz }: { quiz: LastQuiz }) {
  const date = new Date(quiz.finished_at ?? quiz.started_at).toLocaleDateString("pt-BR")
  return (
    <section aria-labelledby="home-last-quiz-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="home-last-quiz-title" className="font-medium">
          Último quiz
        </h2>
        <Link to="/historico" className="text-sm text-primary hover:underline">
          Ver histórico
        </Link>
      </div>
      <Link
        to={`/quiz/${quiz.id}/resultado`}
        className="mt-3 flex items-center justify-between gap-3 rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
      >
        <span>
          <span className="font-medium">{quiz.scope_name ?? MODE_LABELS[quiz.mode] ?? quiz.mode}</span>
          <span className="block text-muted-foreground">{date}</span>
        </span>
        <span className="text-right tabular-nums">
          <span className="font-medium">
            {quiz.correct_count}/{quiz.total_questions}
          </span>
          <span className="block text-muted-foreground">{Math.round(quiz.accuracy * 100)}%</span>
        </span>
      </Link>
    </section>
  )
}
