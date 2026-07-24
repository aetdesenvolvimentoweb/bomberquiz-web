import { useLocation, useParams, Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useQuizResult, type QuizResultResponse } from "@/features/quiz/quiz-api"
import { QuizResultQuestion } from "./quiz-result-question"

// status="in_progress" nunca chega aqui de fato (GET .../result recusa quiz em
// andamento com 409 quiz_still_in_progress — QUIZ-RF-005 E-2), mas o schema
// reaproveita o enum completo de 4 valores — mapeado por exaustividade do TS.
const STATUS_LABELS: Record<QuizResultResponse["status"], string> = {
  in_progress: "Em andamento",
  finished: "Finalizado",
  expired: "Tempo esgotado",
  abandoned: "Abandonado",
}

const STATUS_BADGE_VARIANT: Record<QuizResultResponse["status"], "success" | "destructive" | "secondary"> = {
  in_progress: "secondary",
  finished: "success",
  expired: "destructive",
  abandoned: "secondary",
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—"
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}min ${remainder}s`
}

export function ResultQuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const location = useLocation()
  const initialData = (location.state as { result?: QuizResultResponse } | null)?.result

  const { data: result, isPending, isError } = useQuizResult(quizId ?? "", initialData)

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  if (isError || !result) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Resultado não encontrado</h1>
        <Button asChild className="mt-6">
          <Link to="/quiz/iniciar">Iniciar novo quiz</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Resultado</h1>
        <Badge variant={STATUS_BADGE_VARIANT[result.status]}>{STATUS_LABELS[result.status]}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{Math.round(result.accuracy * 100)}%</p>
          <p className="text-xs text-muted-foreground">Aproveitamento</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">
            {result.correct_count}/{result.total_questions}
          </p>
          <p className="text-xs text-muted-foreground">Acertos</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{result.answered_count}</p>
          <p className="text-xs text-muted-foreground">Respondidas</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-semibold">{formatDuration(result.duration_seconds)}</p>
          <p className="text-xs text-muted-foreground">Duração</p>
        </div>
      </div>

      {result.breakdown_by_subject.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Desempenho por matéria</h2>
          <Table className="mt-2">
            <TableHeader>
              <TableRow>
                <TableHead>Matéria</TableHead>
                <TableHead className="text-right">Acertos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Aproveitamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.breakdown_by_subject.map((entry) => (
                <TableRow key={entry.subject_id}>
                  <TableCell>{entry.subject_name}</TableCell>
                  <TableCell className="text-right">{entry.correct}</TableCell>
                  <TableCell className="text-right">{entry.total}</TableCell>
                  <TableCell className="text-right">{Math.round(entry.accuracy * 100)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-medium">Revisão das questões</h2>
        {result.questions.map((question, index) => (
          <QuizResultQuestion key={question.position} question={question} index={index} />
        ))}
      </div>

      <Button asChild className="mt-8 w-full">
        <Link to="/quiz/iniciar">Iniciar novo quiz</Link>
      </Button>
    </div>
  )
}
