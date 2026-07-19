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
import { useAxes } from "@/features/content/axes-api"
import { useArchiveSubject, useSubjects, type SubjectStatusFilter } from "@/features/content/subjects-api"
import { SubjectFormDialog } from "./subject-form-dialog"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

export function SubjectsPage() {
  const [axisId, setAxisId] = useState<string>("all")
  const [status, setStatus] = useState<SubjectStatusFilter>("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [dialogState, setDialogState] = useState<
    | { open: false }
    | {
        open: true
        subject?: { id: string; axisId: string; name: string; officialSource: string | null }
      }
  >({ open: false })

  const { data: axesData } = useAxes({ status: "all", page: 1, pageSize: 100 })
  const { data, isPending, isError } = useSubjects({
    axisId: axisId === "all" ? undefined : axisId,
    status,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const archiveMutation = useArchiveSubject()

  async function handleToggleArchive(id: string) {
    try {
      await archiveMutation.mutateAsync(id)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível alterar o status da matéria."
      toast.error(message)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const axisOptions = axesData?.items ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Matérias</h1>
          <p className="text-sm text-muted-foreground">Matérias vinculadas aos eixos temáticos do TAP.</p>
        </div>
        <Button onClick={() => setDialogState({ open: true })}>Nova matéria</Button>
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
          value={axisId}
          onChange={(e) => {
            setAxisId(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">Todos os eixos</option>
          {axisOptions.map((axis) => (
            <option key={axis.id} value={axis.id}>
              {axis.name}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubjectStatusFilter)
            setPage(1)
          }}
        >
          <option value="all">Todos</option>
          <option value="active">Ativas</option>
          <option value="archived">Desativadas</option>
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar as matérias.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Eixo</TableHead>
                <TableHead>Fonte oficial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perguntas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhuma matéria encontrada.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground">{subject.axis_name}</TableCell>
                  <TableCell className="text-muted-foreground">{subject.official_source ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={subject.status === "active" ? "success" : "secondary"}>
                      {subject.status === "active" ? "Ativa" : "Desativada"}
                    </Badge>
                  </TableCell>
                  <TableCell>{subject.questions_count}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDialogState({
                          open: true,
                          subject: {
                            id: subject.id,
                            axisId: subject.axis_id,
                            name: subject.name,
                            officialSource: subject.official_source,
                          },
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={archiveMutation.isPending}
                      onClick={() => handleToggleArchive(subject.id)}
                    >
                      {subject.status === "active" ? "Desativar matéria" : "Reativar matéria"}
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
        <SubjectFormDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState(open ? dialogState : { open: false })}
          subject={dialogState.subject}
          defaultAxisId={axisId === "all" ? undefined : axisId}
        />
      )}
    </div>
  )
}
