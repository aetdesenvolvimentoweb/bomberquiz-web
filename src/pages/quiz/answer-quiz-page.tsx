import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useFinishQuiz, useSubmitAnswer, type StartQuizResponse } from "@/features/quiz/quiz-api"
import { useQuizCountdown, QuizTimer } from "./quiz-timer"
import { ApiError } from "@/lib/api/errors"

type AnswerRecord =
  | { kind: "after_each"; submittedIndex: number; correct: boolean; correctIndex: number; explanation: string; sourceReference: string | null }
  | { kind: "at_end"; submittedIndex: number }

export function AnswerQuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const location = useLocation()
  const startPayload = (location.state as { startPayload?: StartQuizResponse } | null)?.startPayload

  if (!quizId || !startPayload) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Sessão de quiz perdida</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O quiz é efêmero: recarregar a página no meio de uma sessão em andamento a encerra. Inicie um novo quiz para continuar.
        </p>
        <Button asChild className="mt-6">
          <Link to="/quiz/iniciar">Iniciar novo quiz</Link>
        </Button>
      </div>
    )
  }

  return <AnswerQuizFlow quizId={quizId} startPayload={startPayload} />
}

function AnswerQuizFlow({ quizId, startPayload }: { quizId: string; startPayload: StartQuizResponse }) {
  const navigate = useNavigate()
  const submitAnswerMutation = useSubmitAnswer()
  const finishMutation = useFinishQuiz()

  const [currentPosition, setCurrentPosition] = useState(1)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [phase, setPhase] = useState<"answering" | "feedback">("answering")
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({})
  const [quizFinishedPending, setQuizFinishedPending] = useState(false)
  const [finishDialogOpen, setFinishDialogOpen] = useState(false)
  const autoFinishTriggered = useRef(false)

  const resultUrl = `/quiz/${quizId}/resultado`
  const countdown = useQuizCountdown(startPayload.started_at, startPayload.time_limit_seconds)
  const answeredCount = Object.keys(answers).length
  const unansweredCount = startPayload.total_questions - answeredCount
  const question = startPayload.questions.find((q) => q.position === currentPosition)
  const currentFeedback = phase === "feedback" ? answers[currentPosition] : undefined

  async function doFinish() {
    try {
      const result = await finishMutation.mutateAsync(quizId)
      navigate(resultUrl, { state: { result } })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível encerrar o quiz.")
    }
  }

  useEffect(() => {
    if (countdown.expired && !autoFinishTriggered.current) {
      autoFinishTriggered.current = true
      void doFinish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown.expired])

  function advance() {
    setPhase("answering")
    setSelectedIndex(null)
    setCurrentPosition((p) => p + 1)
  }

  async function handleSubmit() {
    if (selectedIndex === null) return
    try {
      const response = await submitAnswerMutation.mutateAsync({ quizId, position: currentPosition, submittedIndex: selectedIndex })
      setQuizFinishedPending(response.quiz_finished)
      if (startPayload.explanation_mode === "after_each") {
        setAnswers((prev) => ({
          ...prev,
          [currentPosition]: {
            kind: "after_each",
            submittedIndex: selectedIndex,
            correct: response.correct ?? false,
            correctIndex: response.correct_index ?? 0,
            explanation: response.explanation ?? "",
            sourceReference: response.source_reference ?? null,
          },
        }))
        setPhase("feedback")
      } else {
        setAnswers((prev) => ({ ...prev, [currentPosition]: { kind: "at_end", submittedIndex: selectedIndex } }))
        if (response.quiz_finished) navigate(resultUrl)
        else advance()
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "quiz_expired") {
        toast.error("Tempo esgotado.")
        navigate(resultUrl, { replace: true })
        return
      }
      if (err instanceof ApiError && err.code === "quiz_position_already_answered") {
        advance()
        return
      }
      toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar sua resposta.")
    }
  }

  function handleFeedbackNext() {
    if (quizFinishedPending) {
      navigate(resultUrl)
      return
    }
    advance()
  }

  function handleFinishClick() {
    if (unansweredCount > 0) setFinishDialogOpen(true)
    else void doFinish()
  }

  if (countdown.expired) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Tempo esgotado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Encerrando o quiz…</p>
      </div>
    )
  }

  if (!question) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Questão {currentPosition} de {startPayload.total_questions}
        </p>
        <QuizTimer remainingSeconds={countdown.remainingSeconds} />
      </div>
      <Progress value={((currentPosition - 1) / startPayload.total_questions) * 100} className="mt-2" />

      <div className="mt-6">
        <p className="text-xs font-medium uppercase text-muted-foreground">{question.subject_name}</p>
        {question.image_url && <img src={question.image_url} alt="" className="mt-2 max-w-full rounded-md" />}
        <p className="mt-2 text-lg font-medium">{question.statement}</p>
      </div>

      <RadioGroup
        value={selectedIndex?.toString() ?? currentFeedback?.submittedIndex.toString() ?? ""}
        onValueChange={(v) => setSelectedIndex(Number(v))}
        className="mt-4 gap-2"
        disabled={phase === "feedback"}
      >
        {question.alternatives.map((alternative, index) => {
          const isCorrectAnswer = currentFeedback?.kind === "after_each" && index === currentFeedback.correctIndex
          const isWrongSubmitted = currentFeedback?.kind === "after_each" && !currentFeedback.correct && index === currentFeedback.submittedIndex
          return (
            <label
              key={index}
              htmlFor={`alt-${index}`}
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary" +
                (isCorrectAnswer ? " border-success bg-success/10" : "") +
                (isWrongSubmitted ? " border-destructive bg-destructive/10" : "")
              }
            >
              <RadioGroupItem value={index.toString()} id={`alt-${index}`} />
              {alternative}
            </label>
          )
        })}
      </RadioGroup>

      {currentFeedback?.kind === "after_each" && (
        <div className="mt-4 rounded-lg border p-4">
          <Badge variant={currentFeedback.correct ? "success" : "destructive"}>
            {currentFeedback.correct ? "Você acertou" : "Você errou"}
          </Badge>
          <p className="mt-2 text-sm">{currentFeedback.explanation}</p>
          {currentFeedback.sourceReference && (
            <p className="mt-1 text-xs text-muted-foreground">{currentFeedback.sourceReference}</p>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={handleFinishClick}>
          Encerrar quiz
        </Button>
        {phase === "answering" ? (
          <Button type="button" onClick={handleSubmit} loading={submitAnswerMutation.isPending} disabled={selectedIndex === null}>
            Responder
          </Button>
        ) : (
          <Button type="button" onClick={handleFeedbackNext}>
            {quizFinishedPending ? "Ver resultado" : "Próxima questão"}
          </Button>
        )}
      </div>

      <AlertDialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem {unansweredCount} questões em branco — elas contarão como erro. Encerrar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doFinish()}>Encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
