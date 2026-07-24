import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import type { PerformanceResponse } from "@/features/quiz/performance-api"

type Subject = PerformanceResponse["by_axis"][number]["subjects"][number]

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

const STATUS_CHART_COLOR: Record<Subject["status_badge"], string> = {
  unrated: "hsl(var(--muted-foreground))",
  fraco: "hsl(var(--destructive))",
  medio: "hsl(var(--gold))",
  forte: "hsl(var(--success))",
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
  const chartData = subjects.map((subject) => ({ ...subject, accuracy_pct: Math.round(subject.accuracy * 100) }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{Math.round(overall.accuracy * 100)}%</p>
          <p className="text-xs text-muted-foreground">Aproveitamento</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">
            {overall.correct_answers}/{overall.total_answers}
          </p>
          <p className="text-xs text-muted-foreground">Acertos</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{overall.quizzes_finished}</p>
          <p className="text-xs text-muted-foreground">Quizzes finalizados</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{subjects.length}</p>
          <p className="text-xs text-muted-foreground">Matérias estudadas</p>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div>
          <h3 className="font-medium">Aproveitamento por matéria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject_name" tick={{ fontSize: 12 }} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value) => [`${value}%`, "Aproveitamento"]} />
              <Bar dataKey="accuracy_pct">
                {chartData.map((subject) => (
                  <Cell key={subject.subject_id} fill={STATUS_CHART_COLOR[subject.status_badge]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
