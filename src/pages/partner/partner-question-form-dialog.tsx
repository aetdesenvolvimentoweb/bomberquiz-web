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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useActiveSubjects } from "@/features/content/catalog-api"
import { useCreateOwnQuestion } from "@/features/content/partner-questions-api"
import { partnerQuestionFormSchema, type PartnerQuestionFormValues } from "@/features/content/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

export interface PartnerQuestionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSubjectId?: string
}

const emptyAlternatives: [string, string, string, string] = ["", "", "", ""]

function defaultValues(defaultSubjectId?: string): PartnerQuestionFormValues {
  return {
    subjectId: defaultSubjectId ?? "",
    statement: "",
    alternatives: emptyAlternatives,
    correctIndex: 0,
    explanation: "",
    sourceReference: "",
  }
}

/** Cria rascunho de pergunta própria (PART-RF-002) — toda pergunta nasce em draft, nunca publicada direto. */
export function PartnerQuestionFormDialog({ open, onOpenChange, defaultSubjectId }: PartnerQuestionFormDialogProps) {
  const createMutation = useCreateOwnQuestion()

  // Qualquer matéria ativa é permitida — sem vínculo por especialidade (PART-RF-002 CA-2).
  const { data: subjectsData } = useActiveSubjects()

  const form = useForm<PartnerQuestionFormValues>({
    resolver: zodResolver(partnerQuestionFormSchema),
    defaultValues: defaultValues(defaultSubjectId),
  })

  useEffect(() => {
    if (open) form.reset(defaultValues(defaultSubjectId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(values: PartnerQuestionFormValues) {
    try {
      await createMutation.mutateAsync(values)
      toast.success("Rascunho criado.")
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível criar o rascunho."
      toast.error(message)
    }
  }

  const subjectOptions = subjectsData?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova pergunta</DialogTitle>
          <DialogDescription>
            Cria um rascunho — quando estiver pronto, envie para revisão na lista de perguntas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matéria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma matéria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectOptions.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enunciado</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Ex.: Qual o procedimento correto para…" />
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
                    <Textarea {...field} rows={3} placeholder="Explica por que a alternativa correta está certa." />
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
              <Button type="submit" loading={createMutation.isPending}>
                Salvar rascunho
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
