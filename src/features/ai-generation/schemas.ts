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
