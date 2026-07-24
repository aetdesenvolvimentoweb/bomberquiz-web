import { useEffect, useState } from "react"

export interface QuizCountdown {
  remainingSeconds: number | null
  expired: boolean
}

/**
 * Recalcula o tempo restante a cada tick a partir de `started_at` + `time_limit_seconds`
 * (não decrementa um contador local) — resiliente a aba em segundo plano/drift de
 * relógio. O servidor é a autoridade real (revalida a cada submissão); este hook só
 * controla a exibição/bloqueio visual (QUIZ-RF-004).
 */
export function useQuizCountdown(startedAt: string, timeLimitSeconds: number | null): QuizCountdown {
  const deadline = timeLimitSeconds === null ? null : new Date(startedAt).getTime() + timeLimitSeconds * 1000
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    deadline === null ? null : Math.max(0, Math.round((deadline - Date.now()) / 1000)),
  )

  useEffect(() => {
    if (deadline === null) return
    const tick = () => setRemainingSeconds(Math.max(0, Math.round((deadline - Date.now()) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  return { remainingSeconds, expired: remainingSeconds !== null && remainingSeconds <= 0 }
}

function formatMmSs(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

export function QuizTimer({ remainingSeconds }: { remainingSeconds: number | null }) {
  if (remainingSeconds === null) return null
  const low = remainingSeconds <= 30
  return (
    <span className={low ? "font-mono font-semibold text-destructive" : "font-mono font-semibold"}>
      {formatMmSs(remainingSeconds)}
    </span>
  )
}
