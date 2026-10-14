import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { Mascot } from "@/components/mascot"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useResendVerification } from "@/features/auth/api"
import { ApiError } from "@/lib/api/errors"
import { forgotPasswordSchema as resendSchema, type ForgotPasswordFormValues } from "@/features/auth/schemas"

export function ResendVerificationPage() {
  const [searchParams] = useSearchParams()
  const [sent, setSent] = useState(false)
  const resendMutation = useResendVerification()

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(resendSchema),
    defaultValues: { email: searchParams.get("email") ?? "" },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      await resendMutation.mutateAsync(values.email)
      setSent(true)
    } catch (err) {
      // AUTH-RF-009 CA-3: 3 pedidos/h por e-mail (e 10/h por IP).
      toast.error(
        err instanceof ApiError && err.status === 429
          ? "Muitas solicitações para este e-mail. Aguarde um pouco antes de tentar de novo."
          : "Não foi possível reenviar o e-mail agora. Tente novamente.",
      )
    }
  }

  if (sent) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <Mascot pose="email" alt="Mascote segurando um envelope" className="mx-auto mb-4 w-[120px]" />
        <p className="text-sm text-muted-foreground">
          Se o e-mail estiver cadastrado e ainda não verificado, você receberá um novo link.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reenviar verificação" description="Informe o e-mail usado no cadastro">
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

          <Button type="submit" className="w-full" loading={resendMutation.isPending}>
            {resendMutation.isPending ? "Enviando…" : "Reenviar e-mail"}
          </Button>
        </form>
      </Form>
    </AuthLayout>
  )
}
