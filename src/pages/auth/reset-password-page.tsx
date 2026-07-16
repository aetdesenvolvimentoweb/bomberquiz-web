import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useResetPassword } from "@/features/auth/api"
import { resetPasswordSchema, type ResetPasswordFormValues } from "@/features/auth/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

const FIELD_MAP = { new_password: "newPassword" } as const

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const navigate = useNavigate()
  const resetPasswordMutation = useResetPassword()

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) return
    try {
      await resetPasswordMutation.mutateAsync({ token, newPassword: values.newPassword })
      toast.success("Senha redefinida com sucesso. Faça login novamente.")
      navigate("/login", { replace: true })
    } catch (err) {
      if (applyServerFieldErrors(form, err, FIELD_MAP)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível redefinir a senha."
      toast.error(message)
    }
  }

  if (!token) {
    return (
      <AuthLayout title="Link inválido">
        <p className="text-sm text-muted-foreground">
          Este link de redefinição é inválido ou expirado. Solicite um novo.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/esqueci-senha">Solicitar novo link</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Redefinir senha" description="Escolha uma nova senha para sua conta">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar nova senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={resetPasswordMutation.isPending}>
            {resetPasswordMutation.isPending ? "Salvando…" : "Redefinir senha"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}
