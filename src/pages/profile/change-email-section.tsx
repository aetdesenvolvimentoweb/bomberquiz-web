import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useRequestEmailChange } from "@/features/profile/api"
import { requestEmailChangeSchema, type RequestEmailChangeFormValues } from "@/features/profile/schemas"
import { ApiError } from "@/lib/api/errors"

export function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const [requested, setRequested] = useState(false)
  const requestEmailChangeMutation = useRequestEmailChange()

  const form = useForm<RequestEmailChangeFormValues>({
    resolver: zodResolver(requestEmailChangeSchema),
    defaultValues: { newEmail: "" },
  })

  async function onSubmit(values: RequestEmailChangeFormValues) {
    try {
      await requestEmailChangeMutation.mutateAsync(values.newEmail)
      setRequested(true)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível solicitar a troca de e-mail."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trocar e-mail</CardTitle>
        <CardDescription>E-mail atual: {currentEmail}</CardDescription>
      </CardHeader>
      <CardContent>
        {requested ? (
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para o novo e-mail. Seu e-mail atual continua valendo até você confirmar.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novo e-mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={requestEmailChangeMutation.isPending}>
                {requestEmailChangeMutation.isPending ? "Enviando…" : "Solicitar troca"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
