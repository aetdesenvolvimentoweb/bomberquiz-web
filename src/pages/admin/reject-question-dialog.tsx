import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useRejectQuestion } from "@/features/content/questions-api"
import { rejectQuestionFormSchema, type RejectQuestionFormValues } from "@/features/content/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

export interface RejectQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  questionId: string | null
}

// CONT-RF-016: motivo obrigatório (10-500 caracteres) — segundo diálogo do
// projeto com campo de texto obrigatório, mesma composição de question-form-dialog.tsx.
export function RejectQuestionDialog({ open, onOpenChange, questionId }: RejectQuestionDialogProps) {
  const rejectMutation = useRejectQuestion()

  const form = useForm<RejectQuestionFormValues>({
    resolver: zodResolver(rejectQuestionFormSchema),
    defaultValues: { reason: "" },
  })

  async function onSubmit(values: RejectQuestionFormValues) {
    if (!questionId) return
    try {
      await rejectMutation.mutateAsync({ id: questionId, reason: values.reason })
      toast.success("Pergunta rejeitada — o parceiro foi notificado.")
      form.reset()
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível rejeitar a pergunta."
      toast.error(message)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar pergunta</DialogTitle>
          <DialogDescription>
            O motivo é enviado ao parceiro por e-mail e fica registrado no histórico da pergunta.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Explique o que precisa ser ajustado…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" variant="destructive" loading={rejectMutation.isPending}>
                Rejeitar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
