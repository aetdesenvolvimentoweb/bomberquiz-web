import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useCreateCoupon,
  useUpdateCoupon,
  type AdminCoupon,
  type CreateCouponBody,
} from "@/features/coupons/coupons-admin-api"
import { usePlans } from "@/features/subscription/subscription-api"
import { ApiError } from "@/lib/api/errors"
import { endOfDayInBrasilia, startOfDayInBrasilia, toDateInputInBrasilia } from "@/lib/dates"

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const CODE_PATTERN = /^[A-Za-z0-9]{4,24}$/

type DiscountType = CreateCouponBody["discount_type"]
type PlanSlug = NonNullable<CreateCouponBody["applies_to_plan_slugs"]>[number]

/** "10,50" ou "10.50" → 1050. NaN se não for um valor em reais. */
function reaisToCents(value: string): number {
  const trimmed = value.trim()
  // Com vírgula, o ponto é separador de milhar ("1.000,00"); sem ela, é o decimal.
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return Number.NaN
  return Math.round(Number(normalized) * 100)
}

/** "" → null; senão inteiro positivo, ou NaN. */
function parseMaxUses(value: string): number | null {
  if (value.trim() === "") return null
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : Number.NaN
}

export interface CreateCouponDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// SUB-RF-013 CA-1/CA-2. Código, tipo e valor não mudam depois (CA-5), então
// este é o único lugar onde eles são preenchidos.
export function CreateCouponDialog({ open, onOpenChange }: CreateCouponDialogProps) {
  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<DiscountType>("percent")
  const [value, setValue] = useState("")
  const [validFrom, setValidFrom] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const [planSlugs, setPlanSlugs] = useState<PlanSlug[]>([])
  const createMutation = useCreateCoupon()
  const { data: plans } = usePlans()

  useEffect(() => {
    if (open) {
      setCode("")
      setDiscountType("percent")
      setValue("")
      setValidFrom("")
      setValidUntil("")
      setMaxUses("")
      setPlanSlugs([])
    }
  }, [open])

  const discountValue = discountType === "percent" ? Number(value) : reaisToCents(value)
  const valueValid =
    discountType === "percent"
      ? Number.isInteger(discountValue) && discountValue >= 1 && discountValue <= 100
      : Number.isInteger(discountValue) && discountValue > 0
  const maxUsesNumber = parseMaxUses(maxUses)
  const datesValid = !validFrom || !validUntil || validFrom <= validUntil
  const canSubmit =
    CODE_PATTERN.test(code.trim()) &&
    valueValid &&
    !Number.isNaN(maxUsesNumber) &&
    datesValid &&
    !createMutation.isPending

  function togglePlan(slug: PlanSlug, checked: boolean) {
    setPlanSlugs((current) => (checked ? [...current, slug] : current.filter((s) => s !== slug)))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    try {
      const created = await createMutation.mutateAsync({
        code: code.trim(),
        discount_type: discountType,
        discount_value: discountValue,
        valid_from: validFrom ? startOfDayInBrasilia(validFrom) : null,
        valid_until: validUntil ? endOfDayInBrasilia(validUntil) : null,
        max_uses: maxUsesNumber,
        applies_to_plan_slugs: planSlugs.length > 0 ? planSlugs : null,
      })
      toast.success(`Cupom ${created.code} criado.`)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar o cupom.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cupom</DialogTitle>
          <DialogDescription>
            Código, tipo e valor não podem ser alterados depois. Para outro desconto, crie outro cupom.
          </DialogDescription>
        </DialogHeader>

        <form id="create-coupon-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Código</Label>
            <Input
              id="coupon-code"
              autoComplete="off"
              maxLength={24}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <p className="text-xs text-muted-foreground">De 4 a 24 letras ou números, sem espaços.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-type">Tipo de desconto</Label>
              <select
                id="coupon-type"
                className={SELECT_CLASS}
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value as DiscountType)
                  setValue("")
                }}
              >
                <option value="percent">Percentual</option>
                <option value="fixed_cents">Valor fixo</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value">{discountType === "percent" ? "Percentual (1 a 100)" : "Valor (R$)"}</Label>
              <Input
                id="coupon-value"
                inputMode={discountType === "percent" ? "numeric" : "decimal"}
                placeholder={discountType === "percent" ? "10" : "10,00"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coupon-valid-from">Válido a partir de (opcional)</Label>
              <Input id="coupon-valid-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-valid-until">Válido até (opcional)</Label>
              <Input id="coupon-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
          {!datesValid && <p className="text-sm text-destructive">O fim da validade deve ser depois do início.</p>}

          <div className="space-y-2">
            <Label htmlFor="coupon-max-uses">Limite de usos (opcional)</Label>
            <Input
              id="coupon-max-uses"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Sem limite"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Planos</legend>
            <p className="text-xs text-muted-foreground">Nenhum marcado: vale para todos.</p>
            <div className="flex flex-wrap gap-4">
              {plans?.items.map((plan) => (
                <div key={plan.slug} className="flex items-center gap-2">
                  <Checkbox
                    id={`coupon-plan-${plan.slug}`}
                    checked={planSlugs.includes(plan.slug)}
                    onCheckedChange={(checked) => togglePlan(plan.slug, checked === true)}
                  />
                  <Label htmlFor={`coupon-plan-${plan.slug}`}>{plan.name}</Label>
                </div>
              ))}
            </div>
          </fieldset>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="create-coupon-form" disabled={!canSubmit}>
            Criar cupom
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export interface EditCouponDialogProps {
  coupon: AdminCoupon | null
  onOpenChange: (open: boolean) => void
}

// SUB-RF-013 CA-5: só validade final e limite de usos. Ativar/desativar é
// ação direta na linha da tabela.
export function EditCouponDialog({ coupon, onOpenChange }: EditCouponDialogProps) {
  const [validUntil, setValidUntil] = useState("")
  const [maxUses, setMaxUses] = useState("")
  const updateMutation = useUpdateCoupon()

  useEffect(() => {
    if (coupon) {
      setValidUntil(coupon.valid_until ? toDateInputInBrasilia(coupon.valid_until) : "")
      setMaxUses(coupon.max_uses === null ? "" : String(coupon.max_uses))
    }
  }, [coupon])

  const maxUsesNumber = parseMaxUses(maxUses)
  const maxUsesValid = !Number.isNaN(maxUsesNumber) && (maxUsesNumber === null || maxUsesNumber >= (coupon?.used_count ?? 0))
  const datesValid = !validUntil || !coupon?.valid_from || toDateInputInBrasilia(coupon.valid_from) <= validUntil
  const canSubmit = coupon !== null && maxUsesValid && datesValid && !updateMutation.isPending

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!coupon || !canSubmit) return
    try {
      await updateMutation.mutateAsync({
        id: coupon.id,
        valid_until: validUntil ? endOfDayInBrasilia(validUntil) : null,
        max_uses: maxUsesNumber,
      })
      toast.success(`Cupom ${coupon.code} atualizado.`)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o cupom.")
    }
  }

  return (
    <Dialog open={coupon !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar cupom {coupon?.code}</DialogTitle>
          <DialogDescription>Código, tipo e valor do desconto não podem ser alterados.</DialogDescription>
        </DialogHeader>

        <form id="edit-coupon-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-coupon-valid-until">Válido até</Label>
            <Input id="edit-coupon-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            <p className="text-xs text-muted-foreground">Em branco: sem data final.</p>
          </div>
          {!datesValid && <p className="text-sm text-destructive">O fim da validade deve ser depois do início.</p>}

          <div className="space-y-2">
            <Label htmlFor="edit-coupon-max-uses">Limite de usos</Label>
            <Input
              id="edit-coupon-max-uses"
              type="number"
              inputMode="numeric"
              min={Math.max(1, coupon?.used_count ?? 0)}
              placeholder="Sem limite"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Já usado {coupon?.used_count ?? 0} {coupon?.used_count === 1 ? "vez" : "vezes"}. O limite não pode ficar
              abaixo disso.
            </p>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-coupon-form" disabled={!canSubmit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
