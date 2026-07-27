import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useUpdateGeneratedQuestion } from "@/features/ai-generation/ai-generation-api"
import { editGeneratedQuestionFormSchema, type EditGeneratedQuestionFormValues } from "@/features/ai-generation/schemas"
import { ApiError } from "@/lib/api/errors"

export interface AiGenerationQuestionEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  question: {
    id: string
    statement: string
    alternatives: string[]
    correctIndex: number
    explanation: string
    sourceReference: string | null
  } | null
}

function defaultValues(
  question: AiGenerationQuestionEditDialogProps["question"],
): EditGeneratedQuestionFormValues {
  return {
    statement: question?.statement ?? "",
    alternatives: (question?.alternatives as [string, string, string, string]) ?? ["", "", "", ""],
    correctIndex: question?.correctIndex ?? 0,
    explanation: question?.explanation ?? "",
    sourceReference: question?.sourceReference ?? "",
  }
}

// AIGEN-RF-005: fork de question-form-dialog.tsx sem matéria/imagem/resetStats
// — só os campos de conteúdo da questão gerada, antes da aprovação.
export function AiGenerationQuestionEditDialog({ open, onOpenChange, jobId, question }: AiGenerationQuestionEditDialogProps) {
  const updateMutation = useUpdateGeneratedQuestion()

  const form = useForm<EditGeneratedQuestionFormValues>({
    resolver: zodResolver(editGeneratedQuestionFormSchema),
    defaultValues: defaultValues(question),
  })

  useEffect(() => {
    if (open) form.reset(defaultValues(question))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question?.id])

  async function onSubmit(values: EditGeneratedQuestionFormValues) {
    if (!question) return
    try {
      await updateMutation.mutateAsync({ jobId, questionId: question.id, values })
      toast.success("Questão atualizada.")
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar a questão."
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar questão gerada</DialogTitle>
          <DialogDescription>Ajuste o conteúdo antes de aprovar.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enunciado</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Alternativas (marque a correta)</FormLabel>
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    className="mt-3 h-4 w-4"
                    checked={form.watch("correctIndex") === index}
                    onChange={() => form.setValue("correctIndex", index, { shouldValidate: true })}
                    aria-label={`Marcar alternativa ${index + 1} como correta`}
                  />
                  <FormField
                    control={form.control}
                    name={`alternatives.${index}` as const}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} placeholder={`Alternativa ${index + 1}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
              {(() => {
                const alternativesError = form.formState.errors.alternatives
                const message = alternativesError?.message ?? alternativesError?.root?.message
                return message ? <p className="text-sm font-medium text-destructive">{message}</p> : null
              })()}
            </div>

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourceReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte oficial (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: NT-01 CBMGO, art. 5º, §2º" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" loading={updateMutation.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
