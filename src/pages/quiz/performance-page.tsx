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

      {performance && <PerformanceOverviewSection performance={performance} />}

      <PerformanceTimelineSection />

      <ResetStatsSection />
    </div>
  )
}
