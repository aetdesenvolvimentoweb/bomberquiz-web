import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useArchiveAxis, useAxes, type AxisStatusFilter } from "@/features/content/axes-api"
import { AxisFormDialog } from "./axis-form-dialog"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

export function AxesPage() {
  const [status, setStatus] = useState<AxisStatusFilter>("active")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [dialogState, setDialogState] = useState<
    { open: false } | { open: true; axis?: { id: string; name: string; description: string | null } }
  >({ open: false })

  const { data, isPending, isError } = useAxes({ status, q: q || undefined, page, pageSize: PAGE_SIZE })
  const archiveMutation = useArchiveAxis()

  async function handleToggleArchive(id: string) {
    try {
      await archiveMutation.mutateAsync(id)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível alterar o status do eixo."
      toast.error(message)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Eixos temáticos</h1>
          <p className="text-sm text-muted-foreground">Agrupamentos de matérias do TAP.</p>
        </div>
        <Button onClick={() => setDialogState({ open: true })}>Novo eixo</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nome…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AxisStatusFilter)
            setPage(1)
          }}
        >
          <option value="active">Ativos</option>
          <option value="archived">Desativados</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar os eixos.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matérias</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nenhum eixo encontrado.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((axis) => (
                <TableRow key={axis.id}>
                  <TableCell className="font-medium">{axis.name}</TableCell>
                  <TableCell className="text-muted-foreground">{axis.description ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={axis.status === "active" ? "success" : "secondary"}>
                      {axis.status === "active" ? "Ativo" : "Desativado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{axis.subjects_count}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialogState({ open: true, axis })}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={archiveMutation.isPending}
                      onClick={() => handleToggleArchive(axis.id)}
                    >
                      {axis.status === "active" ? "Desativar eixo" : "Reativar eixo"}
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

      {dialogState.open && (
        <AxisFormDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState(open ? dialogState : { open: false })}
          axis={dialogState.axis}
        />
      )}
    </div>
  )
}
