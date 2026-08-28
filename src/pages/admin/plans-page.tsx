import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCentsToBRL } from "@/features/subscription/schemas"
import { useAdminPlans, type AdminPlan } from "@/features/subscription/plans-admin-api"
import { PlanFormDialog } from "./plan-form-dialog"

// `AdminPlansPage`, não `PlansPage`: já existe uma `PlansPage` em
// pages/subscription/ — a do cliente, que vende. Esta precifica.
export function AdminPlansPage() {
  const { data, isPending, isError } = useAdminPlans()
  const [editing, setEditing] = useState<AdminPlan | null>(null)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Planos</h1>
        <p className="text-sm text-muted-foreground">
          Preços cobrados na assinatura. Alterações valem para compras futuras — o histórico guarda o valor de cada
          compra como ela foi feita.
        </p>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar os planos.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plano</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead className="text-right">PIX</TableHead>
              <TableHead className="text-right">Cartão</TableHead>
              <TableHead className="text-right">Parcelas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell className="text-muted-foreground">{plan.duration_days} dias</TableCell>
                <TableCell className="text-right">{formatCentsToBRL(plan.pix_price)}</TableCell>
                <TableCell className="text-right">{formatCentsToBRL(plan.card_price)}</TableCell>
                <TableCell className="text-right text-muted-foreground">até {plan.max_installments}x</TableCell>
                <TableCell>
                  <Badge variant={plan.is_active ? "success" : "secondary"}>
                    {plan.is_active ? "À venda" : "Desativado"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditing(plan)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Não há "Novo plano" nem "Excluir" de propósito: os 4 slugs são fixos
          (SUB-RF-001 CA-3) porque o checkout endereça o plano por slug, e
          excluir quebraria a FK de `payments.plan_id` — apagando o nome do
          plano do histórico de quem já comprou. Desativar substitui (CA-4). */}
      <PlanFormDialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} plan={editing} />
    </div>
  )
}
