import { z } from "zod"
import { validateBrazilianPhone } from "@/lib/phone"

function isAtLeast18(dob: string): boolean {
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return false
  const ageYears = (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return ageYears >= 18
}

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(3, "Informe o nome completo")
    .max(120, "Nome muito longo")
    .refine((v) => v.trim().includes(" "), "Informe nome e sobrenome"),
  phone: z.string().refine(
    (v) => validateBrazilianPhone(v).valid,
    (v) => ({ message: (validateBrazilianPhone(v) as { reason: string }).reason }),
  ),
  dob: z.string().min(1, "Informe a data de nascimento").refine(isAtLeast18, "É necessário ter pelo menos 18 anos"),
  sex: z.enum(["masculino", "feminino", "prefere_nao_informar"], { message: "Selecione uma opção" }),
})

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>

const passwordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres")
  .max(128, "A senha é longa demais")
  .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra")
  .regex(/\d/, "A senha deve conter ao menos um número")

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas não conferem",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "A nova senha deve ser diferente da atual",
    path: ["newPassword"],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email("E-mail inválido"),
})

export type RequestEmailChangeFormValues = z.infer<typeof requestEmailChangeSchema>

export const reauthActionSchema = z.object({
  password: z.string().min(1, "Informe sua senha"),
})

export type ReauthActionFormValues = z.infer<typeof reauthActionSchema>

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Informe sua senha"),
  confirmIrreversible: z.literal(true, {
    message: "Confirme que entende que esta ação é irreversível",
  }),
})

export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>
