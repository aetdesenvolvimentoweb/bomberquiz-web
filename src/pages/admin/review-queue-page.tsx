import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useApproveQuestion, usePendingQuestions } from "@/features/content/questions-api"
import { RejectQuestionDialog } from "./reject-question-dialog"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

// CONT-RF-014 a 016 — fila de revisão do admin sobre perguntas enviadas por
// parceiros. Reaproveita a estrutura de tabela/paginação de questions-page.tsx,
// com filtro fixo em pending_review e duas ações (aprovar/rejeitar) no lugar de
// editar/arquivar/excluir.
export function ReviewQueuePage() {
  const [page, setPage] = useState(1)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const { data, isPending, isError } = usePendingQuestions({ page, pageSize: PAGE_SIZE })
  const approveMutation = useApproveQuestion()

  async function handleApprove(id: string) {
    try {
      await approveMutation.mutateAsync({ id })
      toast.success("Pergunta aprovada e publicada — o parceiro foi notificado.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível aprovar a pergunta."
      toast.error(message)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Fila de revisão</h1>
        <p className="text-sm text-muted-foreground">
          Perguntas enviadas por parceiros, aguardando aprovação — ordenadas da mais antiga para a mais recente.
        </p>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar a fila de revisão.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enunciado</TableHead>
                <TableHead>Matéria</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Pendências do autor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Nenhuma pergunta aguardando revisão.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="max-w-md font-medium">{question.statement_preview}</TableCell>
                  <TableCell className="text-muted-foreground">{question.subject_name}</TableCell>
                  <TableCell className="text-muted-foreground">{question.author_name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(question.submitted_at)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{question.partner_pending_count}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" loading={approveMutation.isPending} onClick={() => handleApprove(question.id)}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectTarget(question.id)}>
                      Rejeitar
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

      <RejectQuestionDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        questionId={rejectTarget}
      />
    </div>
  )
}
