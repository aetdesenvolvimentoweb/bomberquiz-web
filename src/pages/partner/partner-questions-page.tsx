import { useState } from "react"
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
import { useActiveSubjects } from "@/features/content/catalog-api"
import { useOwnQuestions, type OwnQuestionStatusFilter } from "@/features/content/partner-questions-api"
import { PartnerQuestionFormDialog } from "./partner-question-form-dialog"

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
  const [createOpen, setCreateOpen] = useState(false)

  const { data: subjectsData } = useActiveSubjects()
  const { data, isPending, isError } = useOwnQuestions({
    subjectId: subjectId === "all" ? undefined : subjectId,
    status,
    q: q || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const subjectOptions = subjectsData?.items ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Minhas perguntas</h1>
          <p className="text-sm text-muted-foreground">Perguntas cadastradas por você, em todos os status.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Nova pergunta</Button>
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

      <PartnerQuestionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultSubjectId={subjectId === "all" ? undefined : subjectId}
      />
    </div>
  )
}
