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
