import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useResetPerformanceStats } from "@/features/quiz/performance-api"
import { resetPerformanceStatsSchema, type ResetPerformanceStatsFormValues } from "@/features/quiz/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

function ResetStatsDialog() {
  const [open, setOpen] = useState(false)
  const resetMutation = useResetPerformanceStats()

  const form = useForm<ResetPerformanceStatsFormValues>({
    resolver: zodResolver(resetPerformanceStatsSchema),
    defaultValues: { password: "", confirm: undefined },
  })

  async function onSubmit(values: ResetPerformanceStatsFormValues) {
    try {
      await resetMutation.mutateAsync(values)
      toast.success("Estatísticas zeradas.")
      setOpen(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível zerar as estatísticas."
      toast.error(message)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Zerar estatísticas</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Zerar estatísticas</AlertDialogTitle>
          <AlertDialogDescription>
            Seu histórico de quizzes continua disponível, mas o painel de desempenho e a evolução mensal voltam a
            zero a partir de agora. Confirme sua senha para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">Entendo que essa ação é irreversível</FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <Button type="submit" variant="destructive" loading={resetMutation.isPending}>
                {resetMutation.isPending ? "Zerando…" : "Confirmar"}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ResetStatsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zona de risco</CardTitle>
        <CardDescription>Voltou a estudar do zero? Zere seu histórico de desempenho.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetStatsDialog />
      </CardContent>
    </Card>
  )
}
