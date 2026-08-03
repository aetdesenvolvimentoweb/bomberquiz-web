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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useActiveSubjects } from "@/features/content/catalog-api"
import {
  fetchOwnQuestion,
  useDeleteOwnDraftQuestion,
  useOwnQuestions,
  useSubmitOwnQuestionForReview,
  type OwnQuestionStatusFilter,
} from "@/features/content/partner-questions-api"
import { PartnerQuestionFormDialog, type PartnerQuestionFormDialogProps } from "./partner-question-form-dialog"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em revisão",
  published: "Publicada",
  archived: "Arquivada",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

// PART-RF-001 (listar) + PART-RF-002 (criar rascunho) — só as próprias perguntas
// (author_id=self implícito no backend, PART-RF-001 CA-5).
export function PartnerQuestionsPage() {
  const [subjectId, setSubjectId] = useState<string>("all")
  const [status, setStatus] = useState<OwnQuestionStatusFilter>("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [dialogState, setDialogState] = useState<
    { open: false } | { open: true; question?: PartnerQuestionFormDialogProps["question"] }
  >({ open: false })
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: subjectsData } = useActiveSubjects()
  const { data, isPending, isError } = useOwnQuestions({
    subjectId: subjectId === "all" ? undefined : subjectId,
    status,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const submitMutation = useSubmitOwnQuestionForReview()
  const deleteMutation = useDeleteOwnDraftQuestion()

  async function handleEdit(id: string) {
    setLoadingEditId(id)
    try {
      const question = await fetchOwnQuestion(id)
      setDialogState({
        open: true,
        question: {
          id: question.id,
          subjectId: question.subject_id,
          statement: question.statement,
          alternatives: question.alternatives,
          correctIndex: question.correct_index,
          explanation: question.explanation,
          sourceReference: question.source_reference,
          imageUrl: question.image_url,
          status: question.status,
        },
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível carregar a pergunta."
      toast.error(message)
    } finally {
      setLoadingEditId(null)
    }
  }

  async function handleSubmitForReview(id: string) {
    try {
      await submitMutation.mutateAsync(id)
      toast.success("Pergunta enviada para revisão.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível enviar a pergunta para revisão."
      toast.error(message)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget)
      toast.success("Rascunho excluído.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir o rascunho."
      toast.error(message)
    } finally {
      setDeleteTarget(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const subjectOptions = subjectsData?.items ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Minhas perguntas</h1>
          <p className="text-sm text-muted-foreground">Perguntas cadastradas por você, em todos os status.</p>
        </div>
        <Button onClick={() => setDialogState({ open: true })}>Nova pergunta</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar no enunciado…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
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
            setStatus(e.target.value as OwnQuestionStatusFilter)
            setPage(1)
          }}
        >
          <option value="all">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="pending_review">Em revisão</option>
          <option value="published">Publicada</option>
          <option value="archived">Arquivada</option>
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar suas perguntas.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enunciado</TableHead>
                <TableHead>Matéria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviada em</TableHead>
                <TableHead>Publicada em</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhuma pergunta encontrada.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((question) => {
                // PART-RF-003: editável em draft/published (published dispara resubmissão, aviso no diálogo).
                // pending_review/archived — só admin mexe (fila de revisão / desarquivar).
                const canEdit = question.status === "draft" || question.status === "published"
                const canSubmit = question.status === "draft"
                // PART-RF-005: só rascunho pode ser excluído pelo parceiro (nunca teve passagem por published).
                const canDelete = question.status === "draft"
                return (
                  <TableRow key={question.id}>
                    <TableCell className="max-w-md font-medium">{question.statement_preview}</TableCell>
                    <TableCell className="text-muted-foreground">{question.subject_name}</TableCell>
                    <TableCell className="space-x-2">
                      <Badge variant={question.status === "published" ? "success" : "secondary"}>
                        {STATUS_LABELS[question.status] ?? question.status}
                      </Badge>
                      {question.status === "draft" && question.rejection_reason && (
                        <Badge variant="destructive">Rejeitada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(question.submitted_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(question.published_at)}</TableCell>
                    <TableCell>{question.has_image ? "Sim" : "—"}</TableCell>
                    <TableCell className="text-right">
                      {(canEdit || canSubmit || canDelete) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={loadingEditId === question.id}>
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleEdit(question.id)}>Editar</DropdownMenuItem>
                            )}
                            {canSubmit && (
                              <DropdownMenuItem onClick={() => handleSubmitForReview(question.id)}>
                                Enviar para revisão
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(question.id)}
                              >
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
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
        <PartnerQuestionFormDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState(open ? dialogState : { open: false })}
          question={dialogState.question}
          defaultSubjectId={subjectId === "all" ? undefined : subjectId}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rascunho?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
