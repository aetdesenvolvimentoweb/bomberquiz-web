import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useAxes } from "@/features/content/axes-api"
import { useCreateSubject, useUpdateSubject } from "@/features/content/subjects-api"
import { subjectFormSchema, type SubjectFormValues } from "@/features/content/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

export interface SubjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject?: {
    id: string
    axisId: string
    name: string
    officialSource: string | null
  }
  /** Pré-seleciona o eixo ao criar uma matéria a partir da tela filtrada por eixo. */
  defaultAxisId?: string
}

/** Diálogo compartilhado por criação e edição de matéria (CONT-RF-006/007). */
export function SubjectFormDialog({ open, onOpenChange, subject, defaultAxisId }: SubjectFormDialogProps) {
  const isEditing = subject !== undefined
  const createMutation = useCreateSubject()
  const updateMutation = useUpdateSubject()
  const mutation = isEditing ? updateMutation : createMutation

  // Eixos ativos para o seletor — só eles são elegíveis (CONT-RF-006 CA-2). Se a
  // matéria já pertence a um eixo arquivado (não deveria acontecer, mas não
  // travar a edição por causa disso), o eixo atual segue selecionável.
  const { data: axesData } = useAxes({ status: "active", page: 1, pageSize: 100 })

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      axisId: subject?.axisId ?? defaultAxisId ?? "",
      name: subject?.name ?? "",
      officialSource: subject?.officialSource ?? "",
    },
  })

  // Reseta o formulário quando o diálogo é reaberto para uma matéria diferente (ou para criar).
  useEffect(() => {
    if (open) {
      form.reset({
        axisId: subject?.axisId ?? defaultAxisId ?? "",
        name: subject?.name ?? "",
        officialSource: subject?.officialSource ?? "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subject?.id])

  async function onSubmit(values: SubjectFormValues) {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: subject.id, values })
        toast.success("Matéria atualizada.")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Matéria criada.")
      }
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar a matéria."
      toast.error(message)
    }
  }

  const axisOptions = axesData?.items ?? []
  // Garante que o eixo atual apareça na lista mesmo se não estiver entre os ativos
  // retornados (ex.: eixo foi arquivado depois que a matéria foi criada nele).
  const currentAxisMissing = isEditing && !axisOptions.some((a) => a.id === subject.axisId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar matéria" : "Nova matéria"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados da matéria." : "Cria uma nova matéria vinculada a um eixo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="axisId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eixo temático</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um eixo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currentAxisMissing && (
                        <SelectItem value={subject.axisId}>{subject.name ? "(eixo atual, arquivado)" : subject.axisId}</SelectItem>
                      )}
                      {axisOptions.map((axis) => (
                        <SelectItem key={axis.id} value={axis.id}>
                          {axis.name}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Primeiros Socorros" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="officialSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte oficial (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Manual TAP 2026" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" loading={mutation.isPending}>
                {mutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
