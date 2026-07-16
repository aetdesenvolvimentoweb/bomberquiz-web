import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForgotPassword } from "@/features/auth/api"
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/features/auth/schemas"

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const forgotPasswordMutation = useForgotPassword()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await forgotPasswordMutation.mutateAsync(values.email)
      // Resposta de sucesso é sempre genérica (AUTH-RF-006 CA-1) — não revela se o
      // e-mail existe. Uma falha real (rede, rate limit) ainda deve ser avisada,
      // em vez de mostrar "e-mail enviado" para algo que não foi de fato tentado.
      setSent(true)
    } catch {
      toast.error("Não foi possível enviar o link agora. Tente novamente.")
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <p className="text-sm text-muted-foreground">
          Se houver uma conta com esse e-mail, enviamos as instruções de recuperação.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/login">Voltar ao login</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Esqueci minha senha" description="Informe seu e-mail para receber o link de recuperação">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="voce@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={forgotPasswordMutation.isPending}>
            {forgotPasswordMutation.isPending ? "Enviando…" : "Enviar link de recuperação"}
          </Button>
        </form>
      </Form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/login" className="underline">
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  )
}
