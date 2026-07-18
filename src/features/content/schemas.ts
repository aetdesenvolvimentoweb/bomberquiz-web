import { z } from "zod"

// Espelha as regras gerais de CONT-RF-001 a 004 (espec/docs/rf/content-admin.md).
export const axisFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres").max(80, "Nome deve ter no máximo 80 caracteres"),
  description: z.string().optional(),
})

export type AxisFormValues = z.infer<typeof axisFormSchema>
