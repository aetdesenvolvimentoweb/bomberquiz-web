import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  useAiGenerationJob,
  useApproveGeneratedQuestion,
  useDeleteAiGenerationJob,
} from "@/features/ai-generation/ai-generation-api"
import { AiGenerationQuestionEditDialog } from "./ai-generation-question-edit-dialog"
import { AiGenerationDiscardDialog } from "./ai-generation-discard-dialog"
import { ApiError } from "@/lib/api/errors"

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

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  discarded: "Descartada",
}

const REVIEW_STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  pending: "secondary",
  approved: "success",
  discarded: "destructive",
}

// AIGEN-RF-002: acompanhamento de um job (pending/processing com polling,
// failed com o motivo + exclusão, completed com um resumo — a revisão
// questão-a-questão chega na Fatia 5).
export function AiGenerationJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { data: job, isPending, isError, error } = useAiGenerationJob(jobId!)
  const deleteMutation = useDeleteAiGenerationJob()
  const approveMutation = useApproveGeneratedQuestion()

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmPendingOpen, setConfirmPendingOpen] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [discardingQuestionId, setDiscardingQuestionId] = useState<string | null>(null)

  async function handleApprove(questionId: string) {
    try {
      await approveMutation.mutateAsync({ jobId: jobId!, questionId })
      toast.success("Questão aprovada e publicada.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível aprovar a questão."
      toast.error(message)
    }
  }

  async function handleDelete(confirmDiscardPending: boolean) {
    try {
      await deleteMutation.mutateAsync({ jobId: jobId!, confirmDiscardPending })
      toast.success("Job excluído.")
      navigate("/painel/geracao-ia")
    } catch (err) {
      // AIGEN-RF-009 CA-5: job com questões pending exige confirmação explícita
      // — na prática um job failed quase nunca chega aqui (o worker não
      // persiste resultado parcial), mas o fluxo cobre o caso mesmo assim.
      if (err instanceof ApiError && err.code === "ai_generation_job_has_pending_questions") {
        setConfirmDeleteOpen(false)
        setConfirmPendingOpen(true)
        return
      }
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir o job."
      toast.error(message)
    } finally {
      setConfirmDeleteOpen(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    )
  }

  if (isError) {
    const message = error instanceof ApiError ? error.message : "Não foi possível carregar o job."
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <p className="text-sm text-destructive">{message}</p>
        <Button asChild variant="outline">
          <Link to="/painel/geracao-ia">Voltar ao histórico</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{job.subject_name}</h1>
          <p className="text-sm text-muted-foreground">{job.material_name}</p>
        </div>
        <Badge variant={STATUS_VARIANT[job.status]}>{STATUS_LABEL[job.status]}</Badge>
      </div>

      {(job.status === "pending" || job.status === "processing") && (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed p-10 text-center">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground">
            {job.status === "pending"
              ? job.queue_position > 0
                ? `Aguardando na fila — ${job.queue_position} job(s) à frente.`
                : "Aguardando início do processamento…"
              : "Gerando questões — isso pode levar de 30 segundos a alguns minutos…"}
          </p>
        </div>
      )}

      {job.status === "failed" && (
        <div className="space-y-4 rounded-md border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{job.error_message ?? "Falha desconhecida no processamento."}</p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
            Excluir job
          </Button>
        </div>
      )}

      {job.status === "completed" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {job.question_count_generated ?? 0} de {job.question_count_requested} questões geradas.
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Enunciado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {job.questions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                    Nenhuma questão gerada.
                  </TableCell>
                </TableRow>
              )}
              {job.questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell className="max-w-md font-medium">
                    {question.question_data.statement}
                    {question.edited && <span className="ml-2 text-xs text-muted-foreground">(editado)</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={REVIEW_STATUS_VARIANT[question.review_status]}>
                      {REVIEW_STATUS_LABEL[question.review_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {question.review_status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditingQuestionId(question.id)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          loading={approveMutation.isPending}
                          onClick={() => handleApprove(question.id)}
                        >
                          Aprovar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setDiscardingQuestionId(question.id)}>
                          Descartar
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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

      <AlertDialog open={confirmPendingOpen} onOpenChange={setConfirmPendingOpen}>
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

      {job.status === "completed" && (
        <>
          <AiGenerationQuestionEditDialog
            open={editingQuestionId !== null}
            onOpenChange={(open) => !open && setEditingQuestionId(null)}
            jobId={jobId!}
            question={(() => {
              const q = job.questions.find((item) => item.id === editingQuestionId)
              if (!q) return null
              return {
                id: q.id,
                statement: q.question_data.statement,
                alternatives: q.question_data.alternatives,
                correctIndex: q.question_data.correct_index,
                explanation: q.question_data.explanation,
                sourceReference: q.question_data.source_reference,
              }
            })()}
          />

          <AiGenerationDiscardDialog
            open={discardingQuestionId !== null}
            onOpenChange={(open) => !open && setDiscardingQuestionId(null)}
            jobId={jobId!}
            questionId={discardingQuestionId}
          />
        </>
      )}
    </div>
  )
}
