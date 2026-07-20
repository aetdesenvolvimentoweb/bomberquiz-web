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
import { useAxes } from "@/features/content/axes-api"
import { useSubjects } from "@/features/content/subjects-api"
import {
  fetchQuestion,
  useArchiveQuestion,
  useDeleteQuestion,
  useQuestions,
  type QuestionStatusFilter,
} from "@/features/content/questions-api"
import { QuestionFormDialog, type QuestionFormDialogProps } from "./question-form-dialog"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em revisão",
  published: "Publicada",
  archived: "Arquivada",
}

export function QuestionsPage() {
  const [axisId, setAxisId] = useState<string>("all")
  const [subjectId, setSubjectId] = useState<string>("all")
  const [status, setStatus] = useState<QuestionStatusFilter>("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [dialogState, setDialogState] = useState<
    { open: false } | { open: true; question?: QuestionFormDialogProps["question"] }
  >({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)

  const { data: axesData } = useAxes({ status: "all", page: 1, pageSize: 100 })
  const { data: subjectsData } = useSubjects({
    axisId: axisId === "all" ? undefined : axisId,
    status: "all",
    page: 1,
    pageSize: 100,
  })
  const { data, isPending, isError } = useQuestions({
    axisId: axisId === "all" ? undefined : axisId,
    subjectId: subjectId === "all" ? undefined : subjectId,
    status,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const archiveMutation = useArchiveQuestion()
  const deleteMutation = useDeleteQuestion()

  async function handleToggleArchive(id: string) {
    try {
      await archiveMutation.mutateAsync(id)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível alterar o status da pergunta."
      toast.error(message)
    }
  }

  async function handleEdit(id: string) {
    setLoadingEditId(id)
    try {
      const question = await fetchQuestion(id)
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
        },
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível carregar a pergunta."
      toast.error(message)
    } finally {
      setLoadingEditId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget)
      toast.success("Pergunta excluída definitivamente.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir a pergunta."
      toast.error(message)
    } finally {
      setDeleteTarget(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const axisOptions = axesData?.items ?? []
  const subjectOptions = subjectsData?.items ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Perguntas</h1>
          <p className="text-sm text-muted-foreground">Catálogo de perguntas do quiz.</p>
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
          value={axisId}
          onChange={(e) => {
            setAxisId(e.target.value)
            setSubjectId("all")
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
            setStatus(e.target.value as QuestionStatusFilter)
            setPage(1)
          }}
        >
          <option value="all">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="published">Publicada</option>
          <option value="archived">Arquivada</option>
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar as perguntas.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enunciado</TableHead>
                <TableHead>Matéria</TableHead>
                <TableHead>Eixo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhuma pergunta encontrada.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="max-w-md font-medium">{question.statement_preview}</TableCell>
                  <TableCell className="text-muted-foreground">{question.subject_name}</TableCell>
                  <TableCell className="text-muted-foreground">{question.axis_name}</TableCell>
                  <TableCell>
                    <Badge variant={question.status === "published" ? "success" : "secondary"}>
                      {STATUS_LABELS[question.status] ?? question.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{question.has_image ? "Sim" : "—"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Ações
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={loadingEditId === question.id} onClick={() => handleEdit(question.id)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleArchive(question.id)}>
                          {question.status === "archived" ? "Desarquivar" : "Arquivar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(question.id)}>
                          Excluir definitivamente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
        <QuestionFormDialog
          open={dialogState.open}
          onOpenChange={(open) => setDialogState(open ? dialogState : { open: false })}
          question={dialogState.question}
          defaultSubjectId={subjectId === "all" ? undefined : subjectId}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se a pergunta já tiver respostas registradas, prefira arquivar em vez de
              excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
