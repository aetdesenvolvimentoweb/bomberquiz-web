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
import { useCreateAxis, useUpdateAxis } from "@/features/content/axes-api"
import { axisFormSchema, type AxisFormValues } from "@/features/content/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

export interface AxisFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  axis?: { id: string; name: string; description: string | null; tapWeight: number }
}

/** Diálogo compartilhado por criação e edição de eixo temático (CONT-RF-002/003). */
export function AxisFormDialog({ open, onOpenChange, axis }: AxisFormDialogProps) {
  const isEditing = axis !== undefined
  const createMutation = useCreateAxis()
  const updateMutation = useUpdateAxis()
  const mutation = isEditing ? updateMutation : createMutation

  const form = useForm<AxisFormValues>({
    resolver: zodResolver(axisFormSchema),
    defaultValues: {
      name: axis?.name ?? "",
      description: axis?.description ?? "",
      tapWeight: axis?.tapWeight ?? 0,
    },
  })

  // Reseta o formulário quando o diálogo é reaberto para um eixo diferente (ou para criar).
  useEffect(() => {
    if (open) {
      form.reset({
        name: axis?.name ?? "",
        description: axis?.description ?? "",
        tapWeight: axis?.tapWeight ?? 0,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, axis?.id])

  async function onSubmit(values: AxisFormValues) {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: axis.id, values })
        toast.success("Eixo atualizado.")
      } else {
        await createMutation.mutateAsync(values)
        toast.success("Eixo criado.")
      }
      onOpenChange(false)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível salvar o eixo."
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar eixo temático" : "Novo eixo temático"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize o nome e/ou a descrição do eixo." : "Cria um novo eixo temático no catálogo."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Salvamento" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Agrupa matérias de resgate e emergência" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tapWeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso no TAP</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} step={1} />
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
