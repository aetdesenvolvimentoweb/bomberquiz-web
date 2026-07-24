import { Badge } from "@/components/ui/badge"
import type { QuizResultResponse } from "@/features/quiz/quiz-api"

type ResultQuestion = QuizResultResponse["questions"][number]

function statusBadge(question: ResultQuestion) {
  if (question.submitted_index === null) {
    // is_correct=false ⇒ finalização manual/expiração (contou como erro, QUIZ-RF-003
    // CA-2/QUIZ-RF-004 CA-3); is_correct=null ⇒ abandono (não penaliza, QUIZ-RF-001 CA-6).
    return question.is_correct === false
      ? { label: "Não respondida (contou como erro)", variant: "destructive" as const }
      : { label: "Não respondida", variant: "secondary" as const }
  }
  return question.is_correct
    ? { label: "Correta", variant: "success" as const }
    : { label: "Incorreta", variant: "destructive" as const }
}

export function QuizResultQuestion({ question, index }: { question: ResultQuestion; index: number }) {
  const badge = statusBadge(question)

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Questão {index + 1} — {question.subject_name}
        </p>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      {question.image_url && <img src={question.image_url} alt="" className="mt-2 max-w-full rounded-md" />}
      <p className="mt-2 font-medium">{question.statement}</p>

      <ul className="mt-3 space-y-2">
        {question.alternatives.map((alternative, altIndex) => {
          const isCorrect = altIndex === question.correct_index
          const isSubmitted = altIndex === question.submitted_index
          return (
            <li
              key={altIndex}
              className={
                "rounded-md border p-2 text-sm" +
                (isCorrect ? " border-success bg-success/10" : "") +
                (isSubmitted && !isCorrect ? " border-destructive bg-destructive/10" : "")
              }
            >
              {alternative}
              {isCorrect && <span className="ml-2 text-xs font-medium text-success">(gabarito)</span>}
              {isSubmitted && !isCorrect && <span className="ml-2 text-xs font-medium text-destructive">(sua resposta)</span>}
            </li>
          )
        })}
      </ul>

      <div className="mt-3 rounded-md bg-muted p-3 text-sm">
        <p>{question.explanation}</p>
        {question.source_reference && <p className="mt-1 text-xs text-muted-foreground">{question.source_reference}</p>}
      </div>
    </div>
  )
}
