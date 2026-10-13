import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  useAdminCoupons,
  useUpdateCoupon,
  type AdminCoupon,
  type AdminCouponsFilters,
} from "@/features/coupons/coupons-admin-api"
import { formatCentsToBRL } from "@/features/subscription/schemas"
import { usePlans } from "@/features/subscription/subscription-api"
import { ApiError } from "@/lib/api/errors"
import { CreateCouponDialog, EditCouponDialog } from "./coupon-form-dialog"

const PAGE_SIZE = 20

const SELECT_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function formatDiscount(coupon: AdminCoupon): string {
  return coupon.discount_type === "percent" ? `${coupon.discount_value}%` : formatCentsToBRL(coupon.discount_value)
}

function formatValidity(coupon: AdminCoupon): string {
  if (coupon.valid_from && coupon.valid_until) return `${formatDate(coupon.valid_from)} a ${formatDate(coupon.valid_until)}`
  if (coupon.valid_from) return `A partir de ${formatDate(coupon.valid_from)}`
  if (coupon.valid_until) return `Até ${formatDate(coupon.valid_until)}`
  return "Sem prazo"
}

// SUB-RF-013 — cupons de desconto para o checkout.
export function CouponsPage() {
  const [active, setActive] = useState<AdminCouponsFilters["active"]>("all")
  const [onlyValidNow, setOnlyValidNow] = useState(false)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCoupon | null>(null)

  const { data, isPending, isError } = useAdminCoupons({ active, onlyValidNow, page, pageSize: PAGE_SIZE })
  const { data: plans } = usePlans()
  const updateMutation = useUpdateCoupon()

  const planNames = new Map(plans?.items.map((plan) => [plan.slug, plan.name]))

  async function toggleActive(coupon: AdminCoupon) {
    try {
      await updateMutation.mutateAsync({ id: coupon.id, is_active: !coupon.is_active })
      toast.success(coupon.is_active ? `Cupom ${coupon.code} desativado.` : `Cupom ${coupon.code} reativado.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o cupom.")
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cupons</h1>
          <p className="text-sm text-muted-foreground">
            Descontos aplicados no checkout. Cada cliente usa o mesmo cupom uma vez; o uso só conta quando o pagamento é
            confirmado.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Novo cupom</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Situação"
          className={SELECT_CLASS}
          value={active}
          onChange={(e) => {
            setActive(e.target.value as AdminCouponsFilters["active"])
            setPage(1)
          }}
        >
          <option value="all">Ativos e desativados</option>
          <option value="active">Ativos</option>
          <option value="inactive">Desativados</option>
        </select>
        <div className="flex items-center gap-2">
          <Checkbox
            id="only-valid-now"
            checked={onlyValidNow}
            onCheckedChange={(checked) => {
              setOnlyValidNow(checked === true)
              setPage(1)
            }}
          />
          <Label htmlFor="only-valid-now">Só os dentro da validade hoje</Label>
        </div>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar os cupons.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Planos</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhum cupom encontrado.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                  <TableCell>{formatDiscount(coupon)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatValidity(coupon)}</TableCell>
                  <TableCell>
                    {coupon.used_count}
                    {coupon.max_uses === null ? " (sem limite)" : ` de ${coupon.max_uses}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.applies_to_plan_slugs === null
                      ? "Todos"
                      : coupon.applies_to_plan_slugs.map((slug) => planNames.get(slug) ?? slug).join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.is_active ? "success" : "secondary"}>
                      {coupon.is_active ? "Ativo" : "Desativado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(coupon)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateMutation.isPending}
                      onClick={() => toggleActive(coupon)}
                    >
                      {coupon.is_active ? "Desativar" : "Reativar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <CreateCouponDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCouponDialog coupon={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </div>
  )
}
