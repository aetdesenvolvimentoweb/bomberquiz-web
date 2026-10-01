import { Badge } from "@/components/ui/badge"

export type DifficultyLevel = "very_easy" | "easy" | "medium" | "hard" | "very_hard"

// CONT-RF-017: ordem e rótulos dos 5 níveis, recalculados diariamente pela taxa
// de acerto (pergunta sem respostas é "Médio").
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ["very_easy", "easy", "medium", "hard", "very_hard"]

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  very_easy: "Muito fácil",
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  very_hard: "Muito difícil",
}

interface DifficultyBadgeProps {
  level: DifficultyLevel
  totalAnswers: number
  accuracy: number
}

// Nível só faz sentido para quem já foi sorteado em quiz (published); o title
// mostra a base do cálculo para não confundir "Médio sem respostas" com dado real.
export function DifficultyBadge({ level, totalAnswers, accuracy }: DifficultyBadgeProps) {
  const basis =
    totalAnswers === 0
      ? "Ainda sem respostas"
      : `${totalAnswers} resposta(s), ${Math.round(accuracy * 100)}% de acerto`
  return (
    <Badge variant="outline" title={basis}>
      {DIFFICULTY_LABELS[level]}
    </Badge>
  )
}
