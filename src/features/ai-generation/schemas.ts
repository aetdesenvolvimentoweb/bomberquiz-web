import { z } from "zod"

// Espelha AIGEN-RF-001 CA-1 (espec/docs/rf/ai-generation.md): question_count
// inteiro entre 1 e 30. Os 2 PDFs não entram no schema — são geridos como
// estado local (File | null) na página, mesmo padrão de ImageUploadField.
export const createJobFormSchema = z.object({
  subjectId: z.string().min(1, "Selecione uma matéria"),
  questionCount: z.coerce
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(1, "Mínimo de 1 questão")
    .max(30, "Máximo de 30 questões"),
})

export type CreateJobFormValues = z.infer<typeof createJobFormSchema>

// Espelha AIGEN-RF-005 CA-1 (mesmos limites de UpdateAiGeneratedQuestionBodySchema
// no backend, que por sua vez espelha CONT-RF-010/011) — schema próprio, sem
// dependência de features/content/schemas.ts (convenção do módulo).
export const editGeneratedQuestionFormSchema = z
  .object({
    statement: z.string().min(10, "Enunciado deve ter ao menos 10 caracteres").max(2000, "Enunciado deve ter no máximo 2.000 caracteres"),
    alternatives: z
      .array(z.string().min(1, "Alternativa não pode ser vazia").max(500, "Alternativa deve ter no máximo 500 caracteres"))
      .length(4),
    correctIndex: z.coerce.number().int().min(0).max(3),
    explanation: z.string().min(10, "Justificativa deve ter ao menos 10 caracteres").max(2000, "Justificativa deve ter no máximo 2.000 caracteres"),
    sourceReference: z.string().max(240, "Fonte deve ter no máximo 240 caracteres").optional(),
  })
  .refine(
    (values) => new Set(values.alternatives.map((a) => a.trim())).size === values.alternatives.length,
    { message: "Alternativas não podem ser duplicadas", path: ["alternatives"] },
  )

export type EditGeneratedQuestionFormValues = z.infer<typeof editGeneratedQuestionFormSchema>

// Espelha AIGEN-RF-007 CA-1: motivo livre e opcional (até 500 caracteres) —
// diferente de rejectQuestionFormSchema (motivo obrigatório do fluxo de parceiro).
export const discardGeneratedQuestionFormSchema = z.object({
  reason: z.string().max(500, "Motivo deve ter no máximo 500 caracteres").optional(),
})

export type DiscardGeneratedQuestionFormValues = z.infer<typeof discardGeneratedQuestionFormSchema>
