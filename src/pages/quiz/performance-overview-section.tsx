import { useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useActiveSubjects } from "@/features/content/catalog-api"
import type { PerformanceResponse } from "@/features/quiz/performance-api"

type Subject = PerformanceResponse["by_axis"][number]["subjects"][number]
type Axis = PerformanceResponse["by_axis"][number]
type ChartMode = "axis" | "subject"

const ACCURACY_COLORS: Record<"correct" | "incorrect", string> = {
  correct: "hsl(var(--success))",
  incorrect: "hsl(var(--destructive))",
}

const STATUS_BADGE_LABELS: Record<Subject["status_badge"], string> = {
  unrated: "Sem dados",
  fraco: "Fraco",
  medio: "Médio",
  forte: "Forte",
}

const STATUS_BADGE_VARIANT: Record<Subject["status_badge"], "secondary" | "destructive" | "outline" | "success"> = {
  unrated: "secondary",
  fraco: "destructive",
  medio: "outline",
  forte: "success",
}

function SubjectList({ title, subjects, emptyText }: { title: string; subjects: Subject[]; emptyText: string }) {
  return (
    <div>
      <h3 className="font-medium">{title}</h3>
      {subjects.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {subjects.map((subject) => (
            <li key={subject.subject_id} className="flex items-center justify-between gap-2 text-sm">
              <span>{subject.subject_name}</span>
              <span className="flex items-center gap-2">
                <Badge variant={STATUS_BADGE_VARIANT[subject.status_badge]}>{STATUS_BADGE_LABELS[subject.status_badge]}</Badge>
                <span className="text-muted-foreground">{Math.round(subject.accuracy * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PerformanceOverviewSection({ performance }: { performance: PerformanceResponse }) {
  const { overall, weakest_subjects, strongest_subjects, by_axis } = performance
  const subjects = by_axis.flatMap((axis) => axis.subjects)
  const { data: activeSubjects } = useActiveSubjects()

  const [mode, setMode] = useState<ChartMode>("axis")
  const [selectedAxisId, setSelectedAxisId] = useState<string>(by_axis[0]?.axis_id ?? "")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")

  const selectedAxis: Axis | undefined = by_axis.find((axis) => axis.axis_id === selectedAxisId) ?? by_axis[0]
  const subjectsForAxis = selectedAxis?.subjects ?? []
  const selectedSubject: Subject | undefined =
    subjectsForAxis.find((subject) => subject.subject_id === selectedSubjectId) ?? subjectsForAxis[0]

  const scope =
    mode === "axis"
      ? selectedAxis && { label: selectedAxis.axis_name, total: selectedAxis.total, correct: selectedAxis.correct }
      : selectedSubject && { label: selectedSubject.subject_name, total: selectedSubject.total, correct: selectedSubject.correct }

  const correctPct = scope && scope.total > 0 ? Math.round((scope.correct / scope.total) * 100) : 0
  const errorPct = scope && scope.total > 0 ? 100 - correctPct : 0
  const errors = scope ? scope.total - scope.correct : 0

  const chartData: { key: "correct" | "incorrect"; name: string; pct: number; displayLabel: string }[] = scope
    ? [
        { key: "correct", name: "Acertos", pct: correctPct, displayLabel: `${scope.correct} (${correctPct}%)` },
        { key: "incorrect", name: "Erros", pct: errorPct, displayLabel: `${errors} (${errorPct}%)` },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{overall.total_answers}</p>
          <p className="text-xs text-muted-foreground">Perguntas respondidas</p>
        </div>
        <div
          className="rounded-lg border p-3 text-center"
          title={`${overall.correct_answers} acertos / ${overall.total_answers - overall.correct_answers} erros`}
          aria-label={`Aproveitamento: ${overall.correct_answers} acertos e ${overall.total_answers - overall.correct_answers} erros`}
        >
          <p className="text-2xl font-semibold">{Math.round(overall.accuracy * 100)}%</p>
          <p className="text-xs text-muted-foreground">Aproveitamento</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{overall.quizzes_finished}</p>
          <p className="text-xs text-muted-foreground">Testes finalizados</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">
            {subjects.length}
            {typeof activeSubjects?.total === "number" && `/${activeSubjects.total}`}
          </p>
          <p className="text-xs text-muted-foreground">Matérias estudadas</p>
        </div>
      </div>

      {by_axis.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">{mode === "axis" ? "Aproveitamento por eixo" : "Aproveitamento por matéria"}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={mode === "axis" ? "default" : "outline"} onClick={() => setMode("axis")}>
                  Por eixo
                </Button>
                <Button type="button" size="sm" variant={mode === "subject" ? "default" : "outline"} onClick={() => setMode("subject")}>
                  Por matéria
                </Button>
              </div>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedAxis?.axis_id ?? ""}
                onChange={(e) => setSelectedAxisId(e.target.value)}
                aria-label="Eixo"
              >
                {by_axis.map((axis) => (
                  <option key={axis.axis_id} value={axis.axis_id}>
                    {axis.axis_name}
                  </option>
                ))}
              </select>
              {mode === "subject" && (
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedSubject?.subject_id ?? ""}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  aria-label="Matéria"
                >
                  {subjectsForAxis.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {!scope || scope.total === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "axis" ? "Sem respostas registradas neste eixo ainda." : "Sem respostas registradas nesta matéria ainda."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} unit="%" allowDecimals={false} />
                <Tooltip formatter={(_value, _name, entry: any) => [entry.payload.displayLabel, entry.payload.name]} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={ACCURACY_COLORS[entry.key]} />
                  ))}
                  <LabelList dataKey="displayLabel" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Responda alguns quizzes para ver seu aproveitamento por matéria.</p>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SubjectList title="Pontos fracos" subjects={weakest_subjects} emptyText="Sem dados suficientes ainda (mínimo 10 respostas por matéria)." />
        <SubjectList title="Pontos fortes" subjects={strongest_subjects} emptyText="Sem dados suficientes ainda (mínimo 10 respostas por matéria)." />
      </div>
    </div>
  )
}
