import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  fetchAllAdminPayments,
  useAdminPayments,
  useFinancialOverview,
  type AdminPayment,
} from "@/features/subscription/financial-api"
import { buildPaymentsCsv, downloadCsv } from "@/features/subscription/financial-csv"
import { formatCentsToBRL } from "@/features/subscription/schemas"

const PAGE_SIZE = 20

const STATUS_LABEL: Record<AdminPayment["status"], string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Recusado",
  refunded: "Estornado",
}

const METODO_LABEL: Record<AdminPayment["method"], string> = {
  pix: "PIX",
  card: "Cartão",
  mp_balance: "Saldo MP",
}

const STATUS_VARIANT: Record<AdminPayment["status"], "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
  refunded: "outline",
}

/** `YYYY-MM-DD` do primeiro dia do mês corrente — o default do painel (CA-2). */
function inicioDoMes(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AdminFinancialPage() {
  const [from, setFrom] = useState(inicioDoMes)
  const [to, setTo] = useState(hojeISO)
  const [status, setStatus] = useState<AdminPayment["status"] | "">("")
  const [method, setMethod] = useState<AdminPayment["method"] | "">("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [exportando, setExportando] = useState(false)

  const filtros = {
    from,
    to,
    status: status || undefined,
    method: method || undefined,
    search: search || undefined,
  }

  const overview = useFinancialOverview({ from, to })
  const payments = useAdminPayments({ ...filtros, page, pageSize: PAGE_SIZE })

  const totalPages = payments.data ? Math.max(1, Math.ceil(payments.data.total / PAGE_SIZE)) : 1

  async function handleExportar() {
    setExportando(true)
    try {
      const todas = await fetchAllAdminPayments(filtros)
      if (todas.length === 0) {
        toast.info("Nenhuma transação no período — nada a exportar.")
        return
      }
      downloadCsv(buildPaymentsCsv(todas), `bomberquiz-transacoes-${from}-a-${to}.csv`)
      toast.success(`${todas.length} transação(ões) exportada(s).`)
    } catch {
      toast.error("Não foi possível exportar. Tente novamente.")
    } finally {
      setExportando(false)
    }
  }

  // Qualquer mudança de filtro precisa voltar para a página 1: manter a página 5
  // com um filtro novo mostra uma tabela vazia que parece "nenhum resultado".
  function aplicarFiltro(acao: () => void) {
    acao()
    setPage(1)
  }

  // Guardado no `data` inteiro, não só em `revenue`: o TypeScript não
  // consegue estreitar `overview.data` a partir de uma constante derivada dele,
  // e o bloco também lê `overview.data.users`.
  const consolidado = overview.data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Compras, estornos, taxas do Mercado Pago e o que de fato entrou na conta.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportar} disabled={exportando}>
          {exportando ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">De</span>
          <Input
            type="date"
            value={from}
            aria-label="Início do período"
            onChange={(e) => aplicarFiltro(() => setFrom(e.target.value))}
            className="w-40"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Até</span>
          <Input
            type="date"
            value={to}
            aria-label="Fim do período"
            onChange={(e) => aplicarFiltro(() => setTo(e.target.value))}
            className="w-40"
          />
        </label>
      </div>

      {overview.isPending && <Spinner />}
      {overview.isError && <p className="text-sm text-destructive">Não foi possível carregar o resumo.</p>}

      {consolidado && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              titulo="Cobrado dos clientes"
              valor={formatCentsToBRL(consolidado.revenue.total_cents)}
              detalhe={`${consolidado.revenue.count} compra(s) no período`}
            />
            <Card
              titulo="Estornado"
              valor={formatCentsToBRL(consolidado.revenue.refunded_cents)}
              detalhe={`${consolidado.revenue.refunded_count} devolução(ões)`}
            />
            <Card
              titulo="Taxas do Mercado Pago"
              valor={formatCentsToBRL(consolidado.revenue.fee_cents)}
              detalhe={
                consolidado.revenue.fee_unknown_count > 0
                  ? `Faltam ${consolidado.revenue.fee_unknown_count} — valor incompleto`
                  : "Todas as compras conferidas"
              }
              alerta={consolidado.revenue.fee_unknown_count > 0}
            />
            <Card
              titulo="Recebido na conta"
              valor={formatCentsToBRL(consolidado.revenue.received_cents)}
              detalhe="Depois das taxas, antes dos estornos"
              alerta={consolidado.revenue.fee_unknown_count > 0}
            />
          </div>

          {/*
            Sem este aviso, um período com taxa faltando exibiria um "recebido"
            que parece fechado e está inflado — o pior tipo de erro num painel
            financeiro, porque não se anuncia.
          */}
          {consolidado.revenue.fee_unknown_count > 0 && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              {consolidado.revenue.fee_unknown_count} pagamento(s) ainda sem taxa registrada. As taxas e o líquido acima estão
              incompletos até que a consulta ao Mercado Pago seja refeita para essas compras.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h2 className="mb-2 text-sm font-medium">Por plano</h2>
              {consolidado.revenue.by_plan.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma compra no período.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {consolidado.revenue.by_plan.map((p) => (
                    <li key={p.plan_slug} className="flex justify-between gap-4">
                      <span>
                        {p.plan_name} <span className="text-muted-foreground">({p.count})</span>
                      </span>
                      <span className="tabular-nums">{formatCentsToBRL(p.total_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="mb-2 text-sm font-medium">Por forma de pagamento</h2>
              {consolidado.revenue.by_method.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma compra no período.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {consolidado.revenue.by_method.map((m) => (
                    <li key={m.method} className="flex justify-between gap-4">
                      <span>
                        {METODO_LABEL[m.method]} <span className="text-muted-foreground">({m.count})</span>
                      </span>
                      <span className="tabular-nums">{formatCentsToBRL(m.total_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>
              Assinantes pagos ativos: <strong className="text-foreground">{consolidado.users.active_paid}</strong>
            </span>
            <span>
              Em teste grátis: <strong className="text-foreground">{consolidado.users.in_trial}</strong>
            </span>
          </div>
        </>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Transações</h2>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por nome ou e-mail"
            value={search}
            aria-label="Buscar cliente"
            onChange={(e) => aplicarFiltro(() => setSearch(e.target.value))}
            className="w-64"
          />
          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(e) => aplicarFiltro(() => setStatus(e.target.value as AdminPayment["status"] | ""))}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por forma de pagamento"
            value={method}
            onChange={(e) => aplicarFiltro(() => setMethod(e.target.value as AdminPayment["method"] | ""))}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Todas as formas</option>
            {Object.entries(METODO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        {payments.isPending && <Spinner />}
        {payments.isError && <p className="text-sm text-destructive">Não foi possível carregar as transações.</p>}

        {payments.data && payments.data.items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma transação com esses filtros.</p>
        )}

        {payments.data && payments.data.items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cobrado</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data.items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.user_name}</div>
                        <div className="text-xs text-muted-foreground">{p.user_email}</div>
                      </TableCell>
                      <TableCell>{p.plan_name}</TableCell>
                      <TableCell>
                        {METODO_LABEL[p.method]}
                        {p.installments > 1 && (
                          <span className="text-muted-foreground"> {p.installments}×</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCentsToBRL(p.net_amount)}</TableCell>
                      {/* Travessão, não "R$ 0,00": taxa desconhecida não é taxa zero. */}
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.fee_amount === null ? "—" : formatCentsToBRL(p.fee_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.received_amount === null ? "—" : formatCentsToBRL(p.received_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

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
      </div>
    </div>
  )
}

function Card({
  titulo,
  valor,
  detalhe,
  alerta,
}: {
  titulo: string
  valor: string
  detalhe: string
  alerta?: boolean
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
      <div className={`mt-1 text-xs ${alerta ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}>
        {detalhe}
      </div>
    </div>
  )
}
