import { z } from "zod"

// Espelha o superRefine de StartQuizBodySchema no backend
// (api/src/http/schemas/quiz.schemas.ts) — validação client-side equivalente
// pra falhar rápido antes de bater na API (QUIZ-RF-001 CA-1/CA-2).
export const startQuizFormSchema = z
  .object({
    mode: z.enum(["tap_simulation", "free_subject", "free_axis"]),
    subjectId: z.string().optional(),
    axisId: z.string().optional(),
    size: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]).optional(),
    timerEnabled: z.boolean(),
    timePerQuestionSeconds: z.coerce.number().int().min(60).max(300),
    explanationMode: z.enum(["after_each", "at_end"]),
  })
  .superRefine((values, ctx) => {
    if (values.mode === "free_subject") {
      if (!values.subjectId) ctx.addIssue({ code: "custom", path: ["subjectId"], message: "Selecione uma matéria" })
      if (!values.size) ctx.addIssue({ code: "custom", path: ["size"], message: "Selecione o tamanho do quiz" })
    }
    if (values.mode === "free_axis") {
      if (!values.axisId) ctx.addIssue({ code: "custom", path: ["axisId"], message: "Selecione um eixo" })
      if (!values.size) ctx.addIssue({ code: "custom", path: ["size"], message: "Selecione o tamanho do quiz" })
    }
  })

export type StartQuizFormValues = z.infer<typeof startQuizFormSchema>
