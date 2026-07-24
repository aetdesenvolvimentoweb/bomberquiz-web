import { useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Spinner } from "@/components/ui/spinner"
import { usePerformanceTimeline, type PerformanceTimelineResponse } from "@/features/quiz/performance-api"

const MONTHS_OPTIONS = [3, 6, 12, 24] as const

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-")
  return `${monthNumber}/${year?.slice(2)}`
}

export function PerformanceTimelineSection() {
  const [months, setMonths] = useState(12)
  const { data, isPending, isError } = usePerformanceTimeline(months)

  const chartData = (data?.months ?? [])
    .slice()
    .reverse()
    .map((entry: PerformanceTimelineResponse["months"][number]) => ({
      ...entry,
      accuracy_pct: entry.accuracy === null ? null : Math.round(entry.accuracy * 100),
      label: formatMonthLabel(entry.month),
    }))

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Evolução mensal</h2>
        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          aria-label="Período"
        >
          {MONTHS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              Últimos {option} meses
            </option>
          ))}
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="mt-2 text-sm text-destructive">Não foi possível carregar a evolução mensal.</p>}

      {data && (
        <>
          {data.stats_reset_at && (
            <p className="mt-2 text-sm text-muted-foreground">
              Você zerou suas estatísticas em {new Date(data.stats_reset_at).toLocaleDateString("pt-BR")}.
            </p>
          )}
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value) => [value === null ? "Sem dados" : `${value}%`, "Aproveitamento"]} />
              <Line type="monotone" dataKey="accuracy_pct" stroke="hsl(var(--primary))" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
