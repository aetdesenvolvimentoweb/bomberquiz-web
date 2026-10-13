import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { CardPaymentSection, type CardPaymentSubmission } from "@/features/subscription/card-payment-section"
import { checkoutErrorMessage, formatCentsToBRL } from "@/features/subscription/schemas"
import { useCheckout, useCouponPreview, usePlans, type Plan } from "@/features/subscription/subscription-api"
import { ApiError } from "@/lib/api/errors"

type Method = "pix" | "card"

interface AppliedCoupon {
  code: string
  grossAmount: number
  discountAmount: number
  netAmount: number
}

export function PlansPage() {
  const navigate = useNavigate()
  const { data, isPending } = usePlans()
  const checkoutMutation = useCheckout()
  const [selectedSlug, setSelectedSlug] = useState<Plan["slug"] | null>(null)
  const [method, setMethod] = useState<Method>("pix")
  const [couponInput, setCouponInput] = useState("")
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [couponInvalid, setCouponInvalid] = useState(false)
  const previewMutation = useCouponPreview()
  // Só a resposta da conferência mais recente vale: trocar de plano no meio de
  // uma conferência não pode deixar o desconto do plano anterior na tela.
  const latestPreview = useRef(0)

  const plans = data?.items ?? []
  const selectedPlan = plans.find((plan) => plan.slug === selectedSlug) ?? null

  async function previewCoupon(code: string, planSlug: Plan["slug"], forMethod: Method) {
    const requestId = ++latestPreview.current
    try {
      const result = await previewMutation.mutateAsync({ plan_slug: planSlug, method: forMethod, coupon_code: code })
      if (requestId !== latestPreview.current) return
      if (result.valid) {
        setCoupon({
          code,
          grossAmount: result.gross_amount,
          discountAmount: result.discount_amount,
          netAmount: result.net_amount,
        })
        setCouponInvalid(false)
      } else {
        setCoupon(null)
        setCouponInvalid(true)
      }
    } catch (err) {
      if (requestId !== latestPreview.current) return
      setCoupon(null)
      toast.error(err instanceof ApiError ? err.message : "Não foi possível conferir o cupom.")
    }
  }

  // O desconto depende do preço, que muda com o plano e com o método (cartão
  // custa mais). Cupom já aplicado é conferido de novo a cada troca.
  const appliedCode = coupon?.code
  useEffect(() => {
    if (appliedCode && selectedSlug) void previewCoupon(appliedCode, selectedSlug, method)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, method])

  function handleApplyCoupon() {
    const code = couponInput.trim()
    if (!code || !selectedPlan) return
    void previewCoupon(code, selectedPlan.slug, method)
  }

  function removeCoupon() {
    latestPreview.current++
    setCoupon(null)
    setCouponInput("")
    setCouponInvalid(false)
  }

  function handleCheckoutError(err: unknown) {
    if (err instanceof ApiError && err.code === "coupon_invalid") {
      setCoupon(null)
      setCouponInvalid(true)
    }
    toast.error(err instanceof ApiError ? checkoutErrorMessage(err) : "Não foi possível iniciar o pagamento.")
  }

  function goToPayment(result: { payment_id: string }) {
    navigate(`/assinatura/pagamento/${result.payment_id}`, { state: { checkout: result } })
  }

  async function handlePixCheckout() {
    if (!selectedPlan) return
    try {
      const result = await checkoutMutation.mutateAsync({
        plan_slug: selectedPlan.slug,
        method: "pix",
        coupon_code: coupon?.code,
      })
      goToPayment(result)
    } catch (err) {
      handleCheckoutError(err)
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
        coupon_code: coupon?.code,
      })
      goToPayment(result)
    } catch (err) {
      // Toast aqui (mensagem específica por código) e também relança: o Brick
      // precisa da rejeição para sair do estado "processando" no próprio botão.
      handleCheckoutError(err)
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

            <div className="space-y-2">
              <Label htmlFor="coupon-code">Cupom de desconto</Label>
              {coupon ? (
                <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>
                    Cupom <span className="font-mono font-medium">{coupon.code.toUpperCase()}</span> aplicado:{" "}
                    {formatCentsToBRL(coupon.discountAmount)} de desconto
                  </span>
                  <Button variant="link" size="sm" onClick={removeCoupon}>
                    Remover
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="coupon-code"
                    autoComplete="off"
                    maxLength={24}
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value)
                      setCouponInvalid(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleApplyCoupon()
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    loading={previewMutation.isPending}
                    disabled={!couponInput.trim()}
                  >
                    Aplicar
                  </Button>
                </div>
              )}
              {couponInvalid && <p className="text-sm text-destructive">Cupom inválido ou expirado.</p>}
            </div>

            <p className="text-sm">
              Total:{" "}
              {coupon ? (
                <>
                  <span className="text-muted-foreground line-through">{formatCentsToBRL(coupon.grossAmount)}</span>{" "}
                  <span className="font-semibold">{formatCentsToBRL(coupon.netAmount)}</span>
                </>
              ) : (
                <span className="font-semibold">
                  {formatCentsToBRL(method === "card" ? selectedPlan.card_price : selectedPlan.pix_price)}
                </span>
              )}
            </p>

            {method === "pix" && (
              <Button onClick={handlePixCheckout} loading={checkoutMutation.isPending} className="w-full">
                Pagar com PIX
              </Button>
            )}

            {method === "card" && (
              // `key`: o Brick só lê o valor ao montar; aplicar ou tirar o cupom
              // precisa recriá-lo para as parcelas refletirem o novo total.
              <CardPaymentSection
                key={coupon?.netAmount ?? selectedPlan.card_price}
                amountInCents={coupon?.netAmount ?? selectedPlan.card_price}
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
