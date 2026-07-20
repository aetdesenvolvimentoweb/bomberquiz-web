import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useSubjects } from "@/features/content/subjects-api"
import {
  useCreateQuestion,
  useDeleteQuestionImage,
  useUpdateQuestion,
  useUploadQuestionImage,
} from "@/features/content/questions-api"
import { questionFormSchema, type QuestionFormValues } from "@/features/content/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"
import { ImageUploadField } from "./image-upload-field"

export interface QuestionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  question?: {
    id: string
    subjectId: string
    statement: string
    alternatives: string[]
    correctIndex: number
    explanation: string
    sourceReference: string | null
    imageUrl: string | null
  }
  defaultSubjectId?: string
}

const emptyAlternatives: [string, string, string, string] = ["", "", "", ""]

function defaultValues(question?: QuestionFormDialogProps["question"], defaultSubjectId?: string): QuestionFormValues {
  return {
    subjectId: question?.subjectId ?? defaultSubjectId ?? "",
    statement: question?.statement ?? "",
    alternatives: (question?.alternatives as [string, string, string, string]) ?? emptyAlternatives,
    correctIndex: question?.correctIndex ?? 0,
    explanation: question?.explanation ?? "",
    sourceReference: question?.sourceReference ?? "",
    resetStats: false,
  }
}

/** Diálogo compartilhado por criação e edição de pergunta (CONT-RF-010/011/013). */
export function QuestionFormDialog({ open, onOpenChange, question, defaultSubjectId }: QuestionFormDialogProps) {
  const isEditing = question !== undefined
  const createMutation = useCreateQuestion()
  const updateMutation = useUpdateQuestion()
  const uploadImageMutation = useUploadQuestionImage()
  const deleteImageMutation = useDeleteQuestionImage()
  const mutation = isEditing ? updateMutation : createMutation

  // Só matérias ativas são elegíveis (CONT-RF-010 CA-4/CONT-RF-011 CA-2).
  const { data: subjectsData } = useSubjects({ status: "active", page: 1, pageSize: 100 })

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: defaultValues(question, defaultSubjectId),
  })

  // Estado local para a imagem: a mutation de upload/delete devolve a pergunta
  // atualizada, mas `question` (prop) só muda quando o diálogo reabre — sem
  // isso, o preview não atualizaria até fechar e reabrir o diálogo.
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(question?.imageUrl ?? null)

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(question, defaultSubjectId))
      setCurrentImageUrl(question?.imageUrl ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question?.id])

  async function onSubmit(values: QuestionFormValues) {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: question.id, values })
        toast.success("Pergunta atualizada.")
      } else {
        await createMutation.mutateAsync({ values, asDraft: false })
        toast.success("Pergunta publicada.")
      }
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar a pergunta."
      toast.error(message)
    }
  }

  async function onSaveDraft() {
    const values = form.getValues()
    const valid = await form.trigger()
    if (!valid) return
    try {
      await createMutation.mutateAsync({ values, asDraft: true })
      toast.success("Rascunho salvo.")
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o rascunho."
      toast.error(message)
    }
  }

  const subjectOptions = subjectsData?.items ?? []
  const currentSubjectMissing = isEditing && !subjectOptions.some((s) => s.id === question.subjectId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados da pergunta." : "Cria uma nova pergunta — publicada direto ou como rascunho."}
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
                      {currentSubjectMissing && (
                        <SelectItem value={question.subjectId}>(matéria atual, arquivada)</SelectItem>
                      )}
                      {subjectOptions.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.axis_name} — {subject.name}
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
                    onChange={() => {
                      form.setValue("correctIndex", index, { shouldValidate: true })
                      // CONT-RF-011 CA-5: sugere reset_stats=true quando o gabarito muda.
                      if (isEditing) form.setValue("resetStats", true)
                    }}
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

            {isEditing && (
              <FormField
                control={form.control}
                name="resetStats"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0 font-normal">
                      Zerar estatísticas desta pergunta (respostas antigas continuam guardadas para auditoria)
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            {isEditing && (
              <ImageUploadField
                imageUrl={currentImageUrl}
                isUploading={uploadImageMutation.isPending}
                isDeleting={deleteImageMutation.isPending}
                onUpload={async (file) => {
                  const result = (await uploadImageMutation.mutateAsync({ id: question.id, file })) as { image_url: string | null }
                  setCurrentImageUrl(result.image_url)
                }}
                onDelete={async () => {
                  await deleteImageMutation.mutateAsync(question.id)
                  setCurrentImageUrl(null)
                }}
              />
            )}

            <DialogFooter>
              {!isEditing && (
                <Button type="button" variant="outline" loading={createMutation.isPending} onClick={onSaveDraft}>
                  Salvar como rascunho
                </Button>
              )}
              <Button type="submit" loading={mutation.isPending}>
                {isEditing ? "Salvar" : "Publicar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
