import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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
import { useAiGenerationJob, useDeleteAiGenerationJob } from "@/features/ai-generation/ai-generation-api"
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

// AIGEN-RF-002: acompanhamento de um job (pending/processing com polling,
// failed com o motivo + exclusão, completed com um resumo — a revisão
// questão-a-questão chega na Fatia 5).
export function AiGenerationJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { data: job, isPending, isError, error } = useAiGenerationJob(jobId!)
  const deleteMutation = useDeleteAiGenerationJob()

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmPendingOpen, setConfirmPendingOpen] = useState(false)

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
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-sm">
            {job.question_count_generated ?? 0} de {job.question_count_requested} questões geradas.
          </p>
          <p className="text-sm text-muted-foreground">A revisão das questões geradas chega em uma próxima fatia.</p>
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
    </div>
  )
}
