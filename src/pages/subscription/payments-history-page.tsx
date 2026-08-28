import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCentsToBRL, refundErrorMessage } from "@/features/subscription/schemas"
import { useMyPayments, useRequestRefund } from "@/features/subscription/subscription-api"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  mp_balance: "Saldo Mercado Pago",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
}

const STATUS_BADGE_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  pending: "secondary",
  paid: "success",
  failed: "destructive",
  refunded: "secondary",
}

export function PaymentsHistoryPage() {
  const [status, setStatus] = useState("all")
  const [createdFrom, setCreatedFrom] = useState("")
  const [createdTo, setCreatedTo] = useState("")
  const [page, setPage] = useState(1)
  const [refundTarget, setRefundTarget] = useState<string | null>(null)

  const { data, isPending, isError } = useMyPayments({
    status: status === "all" ? undefined : status,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const refundMutation = useRequestRefund()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  async function handleRefund() {
    if (!refundTarget) return
    try {
      await refundMutation.mutateAsync({ paymentId: refundTarget })
      toast.success("Reembolso solicitado.")
      setRefundTarget(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? refundErrorMessage(err) : "Não foi possível solicitar o reembolso.")
      setRefundTarget(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico de pagamentos</h1>
        <p className="text-sm text-muted-foreground">Seus pagamentos de assinatura.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="failed">Falhou</option>
          <option value="refunded">Reembolsado</option>
        </select>
        <Input
          type="date"
          aria-label="De"
          value={createdFrom}
          onChange={(e) => {
            setCreatedFrom(e.target.value)
            setPage(1)
          }}
          className="w-auto"
        />
        <Input
          type="date"
          aria-label="Até"
          value={createdTo}
          onChange={(e) => {
            setCreatedTo(e.target.value)
            setPage(1)
          }}
          className="w-auto"
        />
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar o histórico de pagamentos.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhum pagamento encontrado.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.plan_name}</TableCell>
                  <TableCell className="text-muted-foreground">{METHOD_LABELS[payment.method] ?? payment.method}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[payment.status] ?? "secondary"}>
                      {STATUS_LABELS[payment.status] ?? payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(payment.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">{formatCentsToBRL(payment.net_amount)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {payment.mp_receipt_url && (
                      <Button asChild variant="outline" size="sm">
                        <a href={payment.mp_receipt_url} target="_blank" rel="noreferrer">
                          Ver comprovante
                        </a>
                      </Button>
                    )}
                    {payment.refundable && (
                      <Button variant="destructive" size="sm" onClick={() => setRefundTarget(payment.id)}>
                        Solicitar reembolso
                      </Button>
                    )}
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

      <AlertDialog open={refundTarget !== null} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Solicitar reembolso?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu pagamento será estornado e, se este era o seu único acesso ativo, a assinatura será cancelada.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} disabled={refundMutation.isPending}>
              {refundMutation.isPending ? "Solicitando…" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
