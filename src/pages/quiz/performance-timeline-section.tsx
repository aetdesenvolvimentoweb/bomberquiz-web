import { useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Spinner } from "@/components/ui/spinner"
import { usePerformanceTimeline, type PerformanceTimelineResponse } from "@/features/quiz/performance-api"

const MONTHS_OPTIONS = [3, 6, 12, 24] as const

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-")
  return `${monthNumber}/${year?.slice(2)}`
}

// "YYYY-MM" + delta meses (delta > 0 anda para o futuro) -> "YYYY-MM".
function addMonthsToKey(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number]
  const totalMonthIndex0 = year * 12 + (monthNumber - 1) + delta
  const y = Math.floor(totalMonthIndex0 / 12)
  const m = (totalMonthIndex0 % 12) + 1
  return `${y}-${String(m).padStart(2, "0")}`
}

type ChartEntry = PerformanceTimelineResponse["months"][number] & { accuracy_pct: number | null; label: string }

function buildBlankEntry(month: string): ChartEntry {
  return { month, total_answers: 0, correct_answers: 0, accuracy: null, quizzes_finished: 0, accuracy_pct: null, label: formatMonthLabel(month) }
}

// Meses sem nenhuma resposta ficam com accuracy null (ver get-performance-timeline.usecase.ts).
// Quando os meses respondidos formam um grupo pequeno perto de uma das pontas (o caso mais comum
// é ter só o mês atual, que é sempre o último do período), o ponto real fica espremido na borda
// do gráfico. Para centralizar, aparamos o excesso de meses vazios de um lado e completamos o
// outro lado com meses futuros em branco, mantendo o total de meses exibidos igual ao período
// selecionado no filtro.
function centerAroundData(entries: ChartEntry[]): ChartEntry[] {
  const populated = entries.map((entry, index) => (entry.accuracy !== null ? index : -1)).filter((index) => index !== -1)
  if (populated.length === 0 || entries.length === 0) return entries

  const first = populated[0]!
  const last = populated[populated.length - 1]!
  const totalPadding = entries.length - (last - first + 1)
  if (totalPadding <= 0) return entries

  const beforePad = Math.min(Math.floor(totalPadding / 2), first)
  const afterPad = totalPadding - beforePad

  const before = entries.slice(first - beforePad, first)
  const middle = entries.slice(first, last + 1)
  const realAfter = entries.slice(last + 1)
  const missingAfter = afterPad - realAfter.length
  const lastMonth = entries[entries.length - 1]!.month
  const syntheticAfter = Array.from({ length: Math.max(missingAfter, 0) }, (_, i) => buildBlankEntry(addMonthsToKey(lastMonth, i + 1)))

  return [...before, ...middle, ...realAfter, ...syntheticAfter]
}

export function PerformanceTimelineSection() {
  const [months, setMonths] = useState(12)
  const { data, isPending, isError } = usePerformanceTimeline(months)

  const chartData = centerAroundData(
    (data?.months ?? [])
      .slice()
      .reverse()
      .map((entry: PerformanceTimelineResponse["months"][number]) => ({
        ...entry,
        accuracy_pct: entry.accuracy === null ? null : Math.round(entry.accuracy * 100),
        label: formatMonthLabel(entry.month),
      })),
  )

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
