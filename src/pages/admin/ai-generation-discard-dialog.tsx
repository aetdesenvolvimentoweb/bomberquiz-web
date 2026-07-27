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
import { useDiscardGeneratedQuestion } from "@/features/ai-generation/ai-generation-api"
import { discardGeneratedQuestionFormSchema, type DiscardGeneratedQuestionFormValues } from "@/features/ai-generation/schemas"
import { ApiError } from "@/lib/api/errors"

export interface AiGenerationDiscardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  questionId: string | null
}

// AIGEN-RF-007: fork de reject-question-dialog.tsx, mas com motivo opcional
// (CA-1 não exige motivo, diferente da rejeição do fluxo de parceiro).
export function AiGenerationDiscardDialog({ open, onOpenChange, jobId, questionId }: AiGenerationDiscardDialogProps) {
  const discardMutation = useDiscardGeneratedQuestion()

  const form = useForm<DiscardGeneratedQuestionFormValues>({
    resolver: zodResolver(discardGeneratedQuestionFormSchema),
    defaultValues: { reason: "" },
  })

  async function onSubmit(values: DiscardGeneratedQuestionFormValues) {
    if (!questionId) return
    try {
      await discardMutation.mutateAsync({
        jobId,
        questionId,
        reason: values.reason ? values.reason : undefined,
      })
      toast.success("Questão descartada.")
      form.reset()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível descartar a questão."
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
          <DialogTitle>Descartar questão gerada?</DialogTitle>
          <DialogDescription>O motivo é opcional — só fica registrado para referência futura.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Ex.: informação incorreta, fora do escopo…" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" variant="destructive" loading={discardMutation.isPending}>
                Descartar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
