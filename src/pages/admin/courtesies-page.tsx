import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useAdminCourtesies,
  useRevokeCourtesy,
  type AdminCourtesy,
  type CourtesyCategoryFilter,
  type CourtesyStatusFilter,
} from "@/features/courtesies/courtesies-admin-api"
import { ApiError } from "@/lib/api/errors"
import { formatDateWithTime } from "@/lib/dates"
import { GrantCourtesyDialog } from "./grant-courtesy-dialog"

const PAGE_SIZE = 20
const MONTHLY_LIMIT = 10
const REASON_MIN = 10

const CATEGORY_LABELS: Record<AdminCourtesy["category"], string> = {
  parceria: "Parceria",
  demonstracao: "Demonstração",
}

const STATUS_LABELS: Record<AdminCourtesy["status"], string> = {
  active: "Ativa",
  expired: "Encerrada",
  revoked: "Revogada",
}

const STATUS_VARIANTS = { active: "success", expired: "secondary", revoked: "destructive" } as const

const SELECT_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

// SUB-RF-008/009/010 — conceder, acompanhar e revogar cortesias de assinatura.
export function CourtesiesPage() {
  const [category, setCategory] = useState<CourtesyCategoryFilter>("all")
  const [status, setStatus] = useState<CourtesyStatusFilter>("all")
  const [includeRevoked, setIncludeRevoked] = useState(false)
  const [page, setPage] = useState(1)
  const [grantOpen, setGrantOpen] = useState(false)
  const [revoking, setRevoking] = useState<AdminCourtesy | null>(null)
  const [reason, setReason] = useState("")

  const { data, isPending, isError } = useAdminCourtesies({ category, status, includeRevoked, page, pageSize: PAGE_SIZE })
  const revokeMutation = useRevokeCourtesy()

  async function handleRevoke() {
    if (!revoking) return
    try {
      await revokeMutation.mutateAsync({ id: revoking.id, reason: reason.trim() })
      toast.success(`Cortesia de ${revoking.beneficiary_name} revogada.`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível revogar a cortesia.")
    } finally {
      setRevoking(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const reasonValid = reason.trim().length >= REASON_MIN

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cortesias</h1>
          <p className="text-sm text-muted-foreground">
            Dias de assinatura dados a parceiros ou para divulgação. Não entram na receita.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button onClick={() => setGrantOpen(true)} disabled={data?.remaining_for_month === 0}>
            Conceder cortesia
          </Button>
          {data && (
            <p className="text-xs text-muted-foreground">
              {data.remaining_for_month === 0
                ? `Limite do mês atingido · renova em ${formatDate(data.resets_at)}`
                : `Você ainda pode conceder ${data.remaining_for_month} de ${MONTHLY_LIMIT} este mês`}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Categoria"
          className={SELECT_CLASS}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as CourtesyCategoryFilter)
            setPage(1)
          }}
        >
          <option value="all">Todas as categorias</option>
          <option value="parceria">Parceria</option>
          <option value="demonstracao">Demonstração</option>
        </select>
        <select
          aria-label="Status"
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CourtesyStatusFilter)
            setPage(1)
          }}
        >
          <option value="all">Ativas e encerradas</option>
          <option value="active">Ativa</option>
          <option value="expired">Encerrada</option>
          <option value="revoked">Revogada</option>
        </select>
        <div className="flex items-center gap-2">
          <Checkbox
            id="include-revoked"
            checked={includeRevoked}
            disabled={status !== "all"}
            onCheckedChange={(checked) => {
              setIncludeRevoked(checked === true)
              setPage(1)
            }}
          />
          <Label htmlFor="include-revoked">Incluir revogadas</Label>
        </div>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar as cortesias.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Concedida por</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhuma cortesia encontrada.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((courtesy) => (
                <TableRow key={courtesy.id}>
                  <TableCell>
                    <div className="font-medium">{courtesy.beneficiary_name}</div>
                    <div className="text-xs text-muted-foreground">{courtesy.beneficiary_email}</div>
                    {courtesy.notes && <div className="text-xs text-muted-foreground">{courtesy.notes}</div>}
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[courtesy.category]}</TableCell>
                  <TableCell>{courtesy.days_granted}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {courtesy.granted_by_admin_name}
                    <div className="text-xs">{formatDate(courtesy.created_at)}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(courtesy.start_at)} a {formatDateWithTime(courtesy.end_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[courtesy.status]}>{STATUS_LABELS[courtesy.status]}</Badge>
                    {courtesy.revocation_reason && (
                      <div className="mt-1 text-xs text-muted-foreground">{courtesy.revocation_reason}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {courtesy.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReason("")
                          setRevoking(courtesy)
                        }}
                      >
                        Revogar
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

      <GrantCourtesyDialog open={grantOpen} onOpenChange={setGrantOpen} />

      <AlertDialog open={revoking !== null} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar cortesia?</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking?.beneficiary_name} perde agora os dias restantes desta cortesia e recebe um e-mail com o
              motivo. Uma assinatura paga dele continua valendo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-courtesy-reason">Motivo (mínimo {REASON_MIN} caracteres)</Label>
            <Textarea
              id="revoke-courtesy-reason"
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={!reasonValid}>
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
