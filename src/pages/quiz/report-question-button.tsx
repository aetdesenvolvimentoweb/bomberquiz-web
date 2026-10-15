import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Flag } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  QUESTION_REPORT_REASON_LABELS,
  useReportQuestion,
  type QuestionReportReason,
} from "@/features/quiz/question-reports-api"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

// Espelha ReportQuestionBodySchema da API (QUIZ-RF-011 CA-1).
const reportQuestionFormSchema = z.object({
  reason: z.enum(["statement", "answer_key", "explanation", "other"], { message: "Escolha o que está errado" }),
  message: z.string().trim().min(10, "Descreva o problema em pelo menos 10 caracteres").max(1000),
})

type ReportQuestionFormValues = z.infer<typeof reportQuestionFormSchema>

const REASONS = Object.entries(QUESTION_REPORT_REASON_LABELS) as [QuestionReportReason, string][]

/**
 * "Reportar problema" de uma questão (QUIZ-RF-011): link discreto que abre o
 * diálogo. Discreto de propósito — está ao lado de uma questão que o cliente
 * está respondendo, e não pode competir com as alternativas.
 *
 * Depois de enviado, vira um texto fixo. O estado vive só aqui: voltando à
 * tela depois, o link reaparece, e um segundo envio cai no 409 da API, que é
 * tratado como "já reportado".
 */
export function ReportQuestionButton({ quizId, position }: { quizId: string; position: number }) {
  const [open, setOpen] = useState(false)
  const [reported, setReported] = useState(false)
  const reportMutation = useReportQuestion()

  const form = useForm<ReportQuestionFormValues>({
    resolver: zodResolver(reportQuestionFormSchema),
    defaultValues: { reason: undefined, message: "" },
  })

  async function onSubmit(values: ReportQuestionFormValues) {
    try {
      await reportMutation.mutateAsync({ quizId, position, ...values })
      toast.success("Obrigado! Vamos analisar e responder por e-mail.")
      setReported(true)
      setOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === "question_already_reported") {
        toast.info(err.message)
        setReported(true)
        setOpen(false)
        return
      }
      if (applyServerFieldErrors(form, err)) return
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar. Tente novamente.")
    }
  }

  if (reported) {
    return <p className="text-xs text-muted-foreground">Problema reportado. Obrigado!</p>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <Flag aria-hidden className="h-3 w-3" />
        Reportar problema
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) form.reset()
          setOpen(next)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar problema na questão</DialogTitle>
            <DialogDescription>
              A equipe analisa e responde por e-mail. O resultado deste quiz não muda.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que está errado?</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
                        {REASONS.map(([value, label]) => (
                          <label
                            key={value}
                            htmlFor={`report-reason-${value}`}
                            className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[[data-state=checked]]:border-primary"
                          >
                            <RadioGroupItem value={value} id={`report-reason-${value}`} />
                            {label}
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explique o problema</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Ex.: pelo manual de APH, a alternativa B também está correta."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={reportMutation.isPending}>
                  Enviar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
