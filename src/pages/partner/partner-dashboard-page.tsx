import { Link } from "react-router-dom"
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
import { usePartnerDashboard } from "@/features/content/partner-questions-api"

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
  unrated: "Sem avaliação",
}

// PART-RF-008 — painel inicial do parceiro: agregados por status/matéria/dificuldade
// e os últimos eventos relevantes (publicadas/rejeitadas), pra priorizar o que revisar.
export function PartnerDashboardPage() {
  const { data, isPending, isError } = usePartnerDashboard()

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Início</h1>
          <p className="text-sm text-muted-foreground">Resumo das suas perguntas e do seu engajamento.</p>
        </div>
        {data && data.unread_review_events > 0 && (
          <Badge variant="destructive">{data.unread_review_events} evento(s) de revisão não lido(s)</Badge>
        )}
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar o painel.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{data.counts.draft}</p>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{data.counts.pending_review}</p>
              <p className="text-xs text-muted-foreground">Em revisão</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{data.counts.published}</p>
              <p className="text-xs text-muted-foreground">Publicadas</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{data.counts.archived}</p>
              <p className="text-xs text-muted-foreground">Arquivadas</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{data.engagement.total_answers_received}</p>
              <p className="text-xs text-muted-foreground">Respostas recebidas</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{formatPct(data.engagement.avg_accuracy)}</p>
              <p className="text-xs text-muted-foreground">Acurácia média</p>
            </div>
            {(["easy", "medium", "hard", "unrated"] as const).map((band) => (
              <div key={band} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-semibold">{data.by_difficulty[band]}</p>
                <p className="text-xs text-muted-foreground">{DIFFICULTY_LABELS[band]}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-3 font-medium">Por matéria</h2>
            {data.by_subject.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma matéria com perguntas publicadas ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matéria</TableHead>
                    <TableHead>Publicadas</TableHead>
                    <TableHead>Respostas</TableHead>
                    <TableHead>Acurácia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.by_subject.map((subject) => (
                    <TableRow key={subject.subject_id}>
                      <TableCell>{subject.subject_name}</TableCell>
                      <TableCell>{subject.count_published}</TableCell>
                      <TableCell>{subject.total_answers}</TableCell>
                      <TableCell>{formatPct(subject.avg_accuracy)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 font-medium">Últimas publicadas</h2>
              {data.last_published.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma pergunta publicada ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {data.last_published.map((question) => (
                    <li key={question.id} className="text-sm">
                      <Link to={`/parceiro/perguntas/${question.id}`} className="font-medium hover:underline">
                        {question.statement_preview}
                      </Link>
                      <p className="text-xs text-muted-foreground">{formatDate(question.published_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="mb-3 font-medium">Últimas rejeitadas</h2>
              {data.last_rejected.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma pergunta rejeitada — bom trabalho!</p>
              ) : (
                <ul className="space-y-2">
                  {data.last_rejected.map((question) => (
                    <li key={question.id} className="text-sm">
                      <Link to={`/parceiro/perguntas/${question.id}`} className="font-medium hover:underline">
                        {question.statement_preview}
                      </Link>
                      <p className="text-xs text-muted-foreground">{question.rejection_reason}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(question.rejected_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
