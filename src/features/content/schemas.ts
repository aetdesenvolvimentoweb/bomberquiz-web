import { z } from "zod"

// Espelha as regras gerais de CONT-RF-001 a 004 (espec/docs/rf/content-admin.md).
export const axisFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres").max(80, "Nome deve ter no máximo 80 caracteres"),
  description: z.string().optional(),
  tapWeight: z.coerce.number().int("Peso TAP deve ser um número inteiro").min(0, "Peso TAP não pode ser negativo"),
})

export type AxisFormValues = z.infer<typeof axisFormSchema>

// Espelha as regras gerais de CONT-RF-005 a 008 (espec/docs/rf/content-admin.md).
export const subjectFormSchema = z.object({
  axisId: z.string().min(1, "Selecione um eixo"),
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres").max(120, "Nome deve ter no máximo 120 caracteres"),
  officialSource: z.string().max(240, "Fonte oficial deve ter no máximo 240 caracteres").optional(),
})

export type SubjectFormValues = z.infer<typeof subjectFormSchema>

// Espelha as regras gerais de CONT-RF-009 a 013 (espec/docs/rf/content-admin.md).
export const questionFormSchema = z
  .object({
    subjectId: z.string().min(1, "Selecione uma matéria"),
    statement: z.string().min(10, "Enunciado deve ter ao menos 10 caracteres").max(2000, "Enunciado deve ter no máximo 2.000 caracteres"),
    alternatives: z
      .array(z.string().min(1, "Alternativa não pode ser vazia").max(500, "Alternativa deve ter no máximo 500 caracteres"))
      .length(4),
    correctIndex: z.coerce.number().int().min(0).max(3),
    explanation: z.string().min(10, "Justificativa deve ter ao menos 10 caracteres").max(2000, "Justificativa deve ter no máximo 2.000 caracteres"),
    sourceReference: z.string().max(240, "Fonte deve ter no máximo 240 caracteres").optional(),
    resetStats: z.boolean().optional(),
  })
  .refine(
    (values) => new Set(values.alternatives.map((a) => a.trim())).size === values.alternatives.length,
    { message: "Alternativas não podem ser duplicadas", path: ["alternatives"] },
  )

export type QuestionFormValues = z.infer<typeof questionFormSchema>

// Espelha CONT-RF-016 CA-1 (motivo obrigatório de 10 a 500 caracteres).
export const rejectQuestionFormSchema = z.object({
  reason: z.string().min(10, "Motivo deve ter ao menos 10 caracteres").max(500, "Motivo deve ter no máximo 500 caracteres"),
})

export type RejectQuestionFormValues = z.infer<typeof rejectQuestionFormSchema>
