import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
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
import { useAiGenerationJobs, useDeleteAiGenerationJob } from "@/features/ai-generation/ai-generation-api"
import { useSubjects } from "@/features/content/subjects-api"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluído",
  failed: "Falhou",
}

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  pending: "secondary",
  processing: "default",
  completed: "success",
  failed: "destructive",
}

export function AiGenerationJobsPage() {
  const [status, setStatus] = useState<string>("all")
  const [subjectId, setSubjectId] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmPendingOpen, setConfirmPendingOpen] = useState(false)

  const { data: subjectsData } = useSubjects({ status: "all", page: 1, pageSize: 100 })
  const { data, isPending, isError } = useAiGenerationJobs({
    status: status === "all" ? undefined : status,
    subjectId: subjectId === "all" ? undefined : subjectId,
    page,
    pageSize: PAGE_SIZE,
  })
  const deleteMutation = useDeleteAiGenerationJob()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const subjectOptions = subjectsData?.items ?? []

  async function handleDelete(confirmDiscardPending: boolean) {
    try {
      await deleteMutation.mutateAsync({ jobId: deletingJobId!, confirmDiscardPending })
      toast.success("Job excluído.")
      setDeletingJobId(null)
    } catch (err) {
      if (err instanceof ApiError && err.code === "ai_generation_job_has_pending_questions") {
        setConfirmDeleteOpen(false)
        setConfirmPendingOpen(true)
        return
      }
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir o job."
      toast.error(message)
      setDeletingJobId(null)
    } finally {
      setConfirmDeleteOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Geração de Questões por IA</h1>
          <p className="text-sm text-muted-foreground">
            Gere questões automaticamente a partir de uma prova de referência e um material de estudo.
          </p>
        </div>
        <Button asChild>
          <Link to="/painel/geracao-ia/novo">Nova geração</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">Todas as matérias</option>
          {subjectOptions.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
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
          <option value="processing">Processando</option>
          <option value="completed">Concluído</option>
          <option value="failed">Falhou</option>
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar o histórico de jobs.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matéria</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Questões</TableHead>
                <TableHead>Revisão</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhum job de geração ainda.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">
                    <Link to={`/painel/geracao-ia/${job.id}`} className="hover:underline">
                      {job.subject_name}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">
                    <div>{job.material_name}</div>
                    {job.status === "failed" && job.error_message && (
                      <div className="truncate text-xs text-destructive">{job.error_message}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[job.status]}>{STATUS_LABEL[job.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    {job.question_count_generated ?? "—"} / {job.question_count_requested}
                  </TableCell>
                  <TableCell>
                    {job.summary ? (
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="success">{job.summary.approved} aprovadas</Badge>
                        <Badge variant="secondary">{job.summary.pending} pendentes</Badge>
                        <Badge variant="destructive">{job.summary.discarded} descartadas</Badge>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(job.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeletingJobId(job.id)
                        setConfirmDeleteOpen(true)
                      }}
                    >
                      Excluir
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

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir job de geração?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(false)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmPendingOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmPendingOpen(false)
            setDeletingJobId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ainda há questões pendentes de revisão</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o job também descarta as questões ainda não revisadas. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(true)}>Excluir mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
