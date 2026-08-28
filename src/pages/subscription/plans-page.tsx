import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { CardPaymentSection, type CardPaymentSubmission } from "@/features/subscription/card-payment-section"
import { checkoutErrorMessage, formatCentsToBRL } from "@/features/subscription/schemas"
import { useCheckout, usePlans, type Plan } from "@/features/subscription/subscription-api"
import { ApiError } from "@/lib/api/errors"

type Method = "pix" | "card"

export function PlansPage() {
  const navigate = useNavigate()
  const { data, isPending } = usePlans()
  const checkoutMutation = useCheckout()
  const [selectedSlug, setSelectedSlug] = useState<Plan["slug"] | null>(null)
  const [method, setMethod] = useState<Method>("pix")

  const plans = data?.items ?? []
  const selectedPlan = plans.find((plan) => plan.slug === selectedSlug) ?? null

  function goToPayment(result: { payment_id: string }) {
    navigate(`/assinatura/pagamento/${result.payment_id}`, { state: { checkout: result } })
  }

  async function handlePixCheckout() {
    if (!selectedPlan) return
    try {
      const result = await checkoutMutation.mutateAsync({ plan_slug: selectedPlan.slug, method: "pix" })
      goToPayment(result)
    } catch (err) {
      toast.error(err instanceof ApiError ? checkoutErrorMessage(err) : "Não foi possível iniciar o pagamento.")
    }
  }

  async function handleCardSubmit(submission: CardPaymentSubmission) {
    if (!selectedPlan) return
    try {
      const result = await checkoutMutation.mutateAsync({
        plan_slug: selectedPlan.slug,
        method: "card",
        card_token: submission.cardToken,
        payment_method_id: submission.paymentMethodId,
        installments: submission.installments,
        device_id: submission.deviceId,
      })
      goToPayment(result)
    } catch (err) {
      // Toast aqui (mensagem específica por código) e também relança: o Brick
      // precisa da rejeição para sair do estado "processando" no próprio botão.
      toast.error(err instanceof ApiError ? checkoutErrorMessage(err) : "Não foi possível iniciar o pagamento.")
      throw err
    }
  }

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Planos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha um plano para continuar praticando.</p>

      <RadioGroup
        value={selectedSlug ?? ""}
        onValueChange={(value) => setSelectedSlug(value as Plan["slug"])}
        className="mt-6 gap-3"
      >
        {plans.map((plan) => (
          <label
            key={plan.slug}
            htmlFor={`plan-${plan.slug}`}
            className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem value={plan.slug} id={`plan-${plan.slug}`} className="mt-1" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium">{plan.name}</p>
                <Badge variant="secondary">{plan.duration_days} dias</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCentsToBRL(plan.pix_price)} no PIX · {formatCentsToBRL(plan.card_price)} no cartão em até{" "}
                {plan.max_installments}x
              </p>
            </div>
          </label>
        ))}
      </RadioGroup>

      {plans.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
      )}

      {selectedPlan && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Forma de pagamento</CardTitle>
            <CardDescription>{selectedPlan.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={method} onValueChange={(value) => setMethod(value as Method)} className="gap-2">
              <label
                htmlFor="method-pix"
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary"
              >
                <RadioGroupItem value="pix" id="method-pix" />
                PIX
              </label>
              <label
                htmlFor="method-card"
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary"
              >
                <RadioGroupItem value="card" id="method-card" />
                Cartão de crédito
              </label>
            </RadioGroup>

            {method === "pix" && (
              <Button onClick={handlePixCheckout} loading={checkoutMutation.isPending} className="w-full">
                Pagar com PIX
              </Button>
            )}

            {method === "card" && (
              <CardPaymentSection
                amountInCents={selectedPlan.card_price}
                maxInstallments={selectedPlan.max_installments}
                onSubmit={handleCardSubmit}
                onError={(message) => toast.error(message)}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
