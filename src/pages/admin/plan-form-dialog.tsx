import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useUpdatePlan, type AdminPlan } from "@/features/subscription/plans-admin-api"
import {
  formatCentsToInput,
  parseBRLToCents,
  planFormSchema,
  suggestCardPriceCents,
  type PlanFormValues,
} from "@/features/subscription/schemas"
import { ApiError } from "@/lib/api/errors"

export interface PlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: AdminPlan | null
}

/**
 * Edição de plano (SUB-RF-001 CA-2). Só edita — não existe criação nem
 * exclusão: os 4 slugs são fixos (CA-3) e desativar substitui excluir (CA-4).
 */
export function PlanFormDialog({ open, onOpenChange, plan }: PlanFormDialogProps) {
  const updateMutation = useUpdatePlan()
  // Enquanto o admin não digitar um preço de cartão próprio, o campo acompanha
  // o PIX (+10%). Depois que ele digita, para de acompanhar — sobrescrever uma
  // edição manual seria roubar o controle de volta no meio da digitação.
  const [cardPriceTouched, setCardPriceTouched] = useState(false)

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      pixPrice: "",
      cardPrice: "",
      maxInstallments: 3,
      isActive: true,
    },
  })

  useEffect(() => {
    if (open && plan) {
      form.reset({
        pixPrice: formatCentsToInput(plan.pix_price),
        cardPrice: formatCentsToInput(plan.card_price),
        maxInstallments: plan.max_installments,
        isActive: plan.is_active,
      })
      setCardPriceTouched(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, plan?.id])

  function handlePixPriceChange(value: string) {
    form.setValue("pixPrice", value, { shouldValidate: form.formState.isSubmitted })
    if (cardPriceTouched) return
    const cents = parseBRLToCents(value)
    if (cents !== null) {
      form.setValue("cardPrice", formatCentsToInput(suggestCardPriceCents(cents)))
    }
  }

  async function onSubmit(values: PlanFormValues) {
    if (!plan) return
    try {
      await updateMutation.mutateAsync({
        id: plan.id,
        body: {
          pix_price: parseBRLToCents(values.pixPrice)!,
          card_price: parseBRLToCents(values.cardPrice)!,
          max_installments: values.maxInstallments,
          is_active: values.isActive,
        },
      })
      toast.success(`Plano ${plan.name} atualizado.`, {
        description: "Compras já feitas mantêm o preço antigo; cobranças PIX pendentes também.",
        duration: 8000,
      })
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar o plano.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar plano {plan?.name}</DialogTitle>
          <DialogDescription>
            {plan ? `${plan.duration_days} dias de acesso.` : ""} O novo preço vale para compras futuras — quem já
            pagou mantém o valor da época.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pixPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço no PIX (R$)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="decimal"
                      placeholder="34,90"
                      onChange={(e) => handlePixPriceChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço no cartão (R$)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="decimal"
                      placeholder="38,39"
                      onChange={(e) => {
                        setCardPriceTouched(true)
                        field.onChange(e)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {cardPriceTouched
                      ? "Valor definido por você."
                      : "Sugerido automaticamente: PIX + 10%, que cobre o custo do parcelamento. Edite se quiser outro."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxInstallments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parcelamento máximo</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={1} max={12} step={1} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5 pr-4">
                    <FormLabel>Disponível para venda</FormLabel>
                    <FormDescription>
                      Desativado, o plano some do catálogo do cliente, mas continua aqui e no histórico de quem já
                      comprou.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" loading={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
