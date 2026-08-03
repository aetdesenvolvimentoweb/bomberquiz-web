import { useEffect, useState } from "react"
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
import {
  useCreateOwnQuestion,
  useDeleteOwnQuestionImage,
  useUpdateOwnQuestion,
  useUploadOwnQuestionImage,
} from "@/features/content/partner-questions-api"
import { partnerQuestionFormSchema, type PartnerQuestionFormValues } from "@/features/content/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"
import { ImageUploadField } from "@/pages/admin/image-upload-field"

export interface PartnerQuestionFormDialogProps {
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
    status: string
  }
  defaultSubjectId?: string
}

const emptyAlternatives: [string, string, string, string] = ["", "", "", ""]

function defaultValues(question?: PartnerQuestionFormDialogProps["question"], defaultSubjectId?: string): PartnerQuestionFormValues {
  return {
    subjectId: question?.subjectId ?? defaultSubjectId ?? "",
    statement: question?.statement ?? "",
    alternatives: (question?.alternatives as [string, string, string, string]) ?? emptyAlternatives,
    correctIndex: question?.correctIndex ?? 0,
    explanation: question?.explanation ?? "",
    sourceReference: question?.sourceReference ?? "",
  }
}

/**
 * Cria rascunho (PART-RF-002) ou edita pergunta própria (PART-RF-003) — toda
 * pergunta nova nasce em draft, nunca publicada direto. Editar uma pergunta
 * `published` devolve para `pending_review` (CA-3) — aviso explícito no formulário.
 */
export function PartnerQuestionFormDialog({ open, onOpenChange, question, defaultSubjectId }: PartnerQuestionFormDialogProps) {
  const isEditing = question !== undefined
  const createMutation = useCreateOwnQuestion()
  const updateMutation = useUpdateOwnQuestion()
  const uploadImageMutation = useUploadOwnQuestionImage()
  const deleteImageMutation = useDeleteOwnQuestionImage()
  const mutation = isEditing ? updateMutation : createMutation

  // Qualquer matéria ativa é permitida — sem vínculo por especialidade (PART-RF-002 CA-2).
  const { data: subjectsData } = useActiveSubjects()

  const form = useForm<PartnerQuestionFormValues>({
    resolver: zodResolver(partnerQuestionFormSchema),
    defaultValues: defaultValues(question, defaultSubjectId),
  })

  // Estado local pro preview da imagem — a mutation de upload/delete devolve a
  // pergunta atualizada, mas `question` (prop) só muda quando o diálogo reabre
  // (mesmo padrão de question-form-dialog.tsx, admin).
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(question?.imageUrl ?? null)

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(question, defaultSubjectId))
      setCurrentImageUrl(question?.imageUrl ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, question?.id])

  async function onSubmit(values: PartnerQuestionFormValues) {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: question.id, values })
        toast.success(question.status === "published" ? "Pergunta atualizada e enviada para revisão." : "Rascunho atualizado.")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Rascunho criado.")
      }
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar a pergunta."
      toast.error(message)
    }
  }

  const subjectOptions = subjectsData?.items ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar pergunta" : "Nova pergunta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da pergunta."
              : "Cria um rascunho — quando estiver pronto, envie para revisão na lista de perguntas."}
          </DialogDescription>
        </DialogHeader>

        {isEditing && question.status === "published" && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Esta pergunta voltará para revisão e ficará indisponível para clientes até a nova aprovação.
          </p>
        )}

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
              <Button type="submit" loading={mutation.isPending}>
                {isEditing ? "Salvar" : "Salvar rascunho"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
