import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useChangePassword } from "@/features/profile/api"
import { changePasswordSchema, type ChangePasswordFormValues } from "@/features/profile/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

const FIELD_MAP = { current_password: "currentPassword", new_password: "newPassword" } as const

export function ChangePasswordSection() {
  const changePasswordMutation = useChangePassword()

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  })

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await changePasswordMutation.mutateAsync(values)
      toast.success("Senha alterada. Enviamos um alerta de segurança para seu e-mail.")
      form.reset()
    } catch (err) {
      if (applyServerFieldErrors(form, err, FIELD_MAP)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível alterar a senha."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trocar senha</CardTitle>
        <CardDescription>Você continuará conectado neste dispositivo após a troca.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha atual</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="confirmNewPassword"
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

            <Button type="submit" loading={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? "Salvando…" : "Trocar senha"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
