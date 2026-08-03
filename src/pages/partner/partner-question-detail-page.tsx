import { useEffect } from "react"
import { Link, useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import {
  DASHBOARD_QUERY_KEY,
  useOwnQuestion,
  useOwnQuestionReviewHistory,
} from "@/features/content/partner-questions-api"

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em revisão",
  published: "Publicada",
  archived: "Arquivada",
}

const EVENT_LABELS: Record<string, string> = {
  submitted: "Enviada para revisão",
  approved: "Aprovada",
  rejected: "Rejeitada",
  edit_after_published: "Editada após publicação (reenviada automaticamente)",
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

// PART-RF-007 — histórico de revisão de uma pergunta própria. Também é o
// destino do link enviado nos e-mails de aprovação/rejeição (CONT-RF-015/016).
// Consultar esta página marca os eventos de revisão como lidos no backend
// (CA-4) — por isso invalidamos o dashboard ao carregar, pra refletir o
// unread_review_events zerado sem esperar um reload manual.
export function PartnerQuestionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: question, isPending: questionPending, isError: questionError } = useOwnQuestion(id ?? "")
  const { data: history, isPending: historyPending, isError: historyError } = useOwnQuestionReviewHistory(id ?? "")

  useEffect(() => {
    if (history) queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
  }, [history, queryClient])

  const isPending = questionPending || historyPending
  const isError = questionError || historyError

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/parceiro/perguntas">← Minhas perguntas</Link>
        </Button>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar esta pergunta.</p>}

      {question && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{question.statement}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={question.status === "published" ? "success" : "secondary"}>
              {STATUS_LABELS[question.status] ?? question.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{question.subject_name}</span>
          </div>
        </div>
      )}

      {history && (
        <div>
          <h2 className="mb-3 font-medium">Histórico de revisão</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta pergunta ainda não passou por revisão.</p>
          ) : (
            <ol className="space-y-4 border-l pl-4">
              {history.map((entry, index) => (
                <li key={index}>
                  <p className="font-medium">{EVENT_LABELS[entry.event] ?? entry.event}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
                  {entry.by_admin_name && <p className="text-sm text-muted-foreground">Por {entry.by_admin_name}</p>}
                  {entry.notes && <p className="text-sm">{entry.notes}</p>}
                  {entry.rejection_reason && <p className="text-sm text-destructive">{entry.rejection_reason}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
