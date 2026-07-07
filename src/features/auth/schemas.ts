import { z } from "zod"

// Espelha as regras gerais de auth.md — validação client-side é só para feedback rápido;
// o backend continua sendo a fonte de verdade.

const passwordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres")
  .max(128, "A senha é longa demais")
  .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra")
  .regex(/\d/, "A senha deve conter ao menos um número")

function isAtLeast18(dob: string): boolean {
  const birthDate = new Date(dob)
  if (Number.isNaN(birthDate.getTime())) return false
  const ageMs = Date.now() - birthDate.getTime()
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)
  return ageYears >= 18
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(3, "Informe o nome completo")
      .max(120, "Nome muito longo")
      .refine((v) => v.trim().includes(" "), "Informe nome e sobrenome"),
    email: z.string().email("E-mail inválido"),
    phone: z
      .string()
      .regex(/^55\d{11}$/, "Formato esperado: 55 + DDD + número (ex.: 5561999999999)"),
    dob: z
      .string()
      .min(1, "Informe a data de nascimento")
      .refine(isAtLeast18, "É necessário ter pelo menos 18 anos"),
    sex: z.enum(["masculino", "feminino", "prefere_nao_informar"], {
      message: "Selecione uma opção",
    }),
    password: passwordSchema,
    confirmPassword: z.string(),
    consentAccepted: z.literal(true, {
      message: "É necessário aceitar os termos e a política de privacidade",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
