import { Link } from "react-router-dom"
import { Mascot } from "@/components/mascot"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { usePerformance } from "@/features/quiz/performance-api"
import { PerformanceOverviewSection } from "./performance-overview-section"
import { PerformanceTimelineSection } from "./performance-timeline-section"
import { ResetStatsSection } from "./reset-stats-section"

export function PerformancePage() {
  const { data: performance, isPending, isError } = usePerformance()

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Desempenho</h1>
        <p className="text-sm text-muted-foreground">Como você está indo na preparação para o TAP.</p>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar seu desempenho.</p>}

      {/* Sem nenhuma resposta, os cards mostrariam 0 e 0% e os gráficos,
          vazio — números que parecem um resultado ruim, quando o que existe é
          ausência de resultado. */}
      {performance && performance.overall.total_answers === 0 && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Mascot pose="looking" alt="Mascote olhando por um binóculo" className="w-[140px] sm:w-[160px]" />
          <div>
            <p className="font-medium">Ainda não há o que medir</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Responda alguns quizzes e aqui aparece onde você já está forte e onde vale reforçar.
            </p>
          </div>
          <Button asChild>
            <Link to="/quiz/iniciar">Iniciar quiz</Link>
          </Button>
        </div>
      )}

      {performance && performance.overall.total_answers > 0 && <PerformanceOverviewSection performance={performance} />}

      <PerformanceTimelineSection />

      <ResetStatsSection />
    </div>
  )
}
