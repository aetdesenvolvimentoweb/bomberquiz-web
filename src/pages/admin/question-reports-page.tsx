import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { fetchQuestion } from "@/features/content/questions-api"
import {
  QUESTION_REPORT_REASON_LABELS,
  useAdminQuestionReports,
  useResolveQuestionReports,
  type ReportedQuestion,
} from "@/features/quiz/question-reports-api"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"
import { QuestionFormDialog, type QuestionFormDialogProps } from "./question-form-dialog"

const PAGE_SIZE = 10
const LETTERS = ["A", "B", "C", "D"] as const

const RESOLUTION_LABELS = { corrected: "Corrigida", dismissed: "Mantida" } as const

type QuestionContent = { statement: string; alternatives: string[]; correct_index: number; explanation: string }

/** Enunciado, alternativas (gabarito em verde) e explicação — versão atual ou o que o cliente viu. */
function QuestionContentView({ content }: { content: QuestionContent }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">{content.statement}</p>
      <ul className="space-y-1">
        {content.alternatives.map((alternative, i) => (
          <li
            key={i}
            className={"rounded-md border px-2 py-1" + (i === content.correct_index ? " border-success bg-success/10" : "")}
          >
            <span className="mr-2 font-medium text-muted-foreground">{LETTERS[i]})</span>
            {alternative}
          </li>
        ))}
      </ul>
      <p className="rounded-md bg-muted p-2 text-muted-foreground">{content.explanation}</p>
    </div>
  )
}

/**
 * QUIZ-RF-011 CA-7/CA-8 (`/painel/contestacoes`): uma entrada por pergunta,
 * com as contestações recebidas. A correção é feita no editor de perguntas de
 * sempre ("Editar pergunta"); "Resolver" fecha todas as abertas de uma vez e
 * manda o retorno a cada cliente.
 */
export function QuestionReportsPage() {
  const [status, setStatus] = useState<"open" | "resolved">("open")
  const [page, setPage] = useState(1)
  const [editState, setEditState] = useState<QuestionFormDialogProps["question"] | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<ReportedQuestion | null>(null)

  const { data, isPending, isError, refetch } = useAdminQuestionReports(status, page, PAGE_SIZE)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  async function handleEdit(id: string) {
    setLoadingEditId(id)
    try {
      const question = await fetchQuestion(id)
      setEditState({
        id: question.id,
        subjectId: question.subject_id,
        statement: question.statement,
        alternatives: question.alternatives,
        correctIndex: question.correct_index,
        explanation: question.explanation,
        sourceReference: question.source_reference,
        imageUrl: question.image_url,
      })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar a pergunta.")
    } finally {
      setLoadingEditId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Contestações</h1>
        <p className="text-sm text-muted-foreground">
          Problemas apontados por clientes nas questões. Corrija pelo editor e resolva para avisar cada um por e-mail.
        </p>
      </div>

      <div className="flex gap-2">
        {(["open", "resolved"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "default" : "outline"}
            onClick={() => {
              setStatus(value)
              setPage(1)
            }}
          >
            {value === "open" ? "Abertas" : "Resolvidas"}
          </Button>
        ))}
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {isError && <p className="text-sm text-destructive">Não foi possível carregar as contestações.</p>}

      {data && data.items.length === 0 && (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {status === "open" ? "Nenhuma contestação aberta." : "Nenhuma contestação resolvida ainda."}
        </p>
      )}

      {data?.items.map((item) => (
        <section key={item.question.id} className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">{item.question.subject_name}</p>
              <p className="text-muted-foreground">
                Autor: {item.question.author.name}
                {item.question.author.role === "partner" && <Badge variant="outline" className="ml-2">Parceiro</Badge>}
              </p>
            </div>
            {status === "open" && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={loadingEditId === item.question.id}
                  onClick={() => void handleEdit(item.question.id)}
                >
                  Editar pergunta
                </Button>
                <Button type="button" size="sm" onClick={() => setResolveTarget(item)}>
                  Resolver
                </Button>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium">Versão atual</h2>
            <QuestionContentView content={item.question} />
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium">
              {item.reports.length === 1 ? "1 contestação" : `${item.reports.length} contestações`}
            </h2>
            <ul className="space-y-3">
              {item.reports.map((report) => (
                <li key={report.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{QUESTION_REPORT_REASON_LABELS[report.reason]}</Badge>
                    <span className="text-muted-foreground">
                      {report.reporter.name} ({report.reporter.email}) ·{" "}
                      {new Date(report.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line">{report.message}</p>
                  {report.resolution && (
                    <p className="mt-2 text-muted-foreground">
                      <Badge variant={report.resolution === "corrected" ? "success" : "outline"} className="mr-2">
                        {RESOLUTION_LABELS[report.resolution]}
                      </Badge>
                      {report.resolution_note}
                    </p>
                  )}
                  {/* O que o cliente viu pode já não ser a versão atual (a pergunta
                      foi editada depois, ou as alternativas vieram embaralhadas). */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">O que o cliente viu no quiz</summary>
                    <div className="mt-2">
                      <QuestionContentView content={report.snapshot} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {editState && (
        <QuestionFormDialog
          open
          onOpenChange={(open) => {
            if (open) return
            setEditState(null)
            // "Versão atual" acima precisa refletir a edição.
            void refetch()
          }}
          question={editState}
        />
      )}

      <ResolveDialog target={resolveTarget} onClose={() => setResolveTarget(null)} />
    </div>
  )
}

const resolveFormSchema = z.object({
  resolution: z.enum(["corrected", "dismissed"], { message: "Escolha o resultado" }),
  note: z.string().trim().min(10, "Escreva a resposta ao cliente em pelo menos 10 caracteres").max(1000),
})

type ResolveFormValues = z.infer<typeof resolveFormSchema>

function ResolveDialog({ target, onClose }: { target: ReportedQuestion | null; onClose: () => void }) {
  const resolveMutation = useResolveQuestionReports()
  const form = useForm<ResolveFormValues>({
    resolver: zodResolver(resolveFormSchema),
    defaultValues: { resolution: undefined, note: "" },
  })

  const count = target?.reports.length ?? 0

  async function onSubmit(values: ResolveFormValues) {
    if (!target) return
    try {
      await resolveMutation.mutateAsync({ questionId: target.question.id, ...values })
      toast.success(count === 1 ? "Resolvida — o cliente foi avisado." : `Resolvidas — ${count} clientes foram avisados.`)
      form.reset()
      onClose()
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      toast.error(err instanceof ApiError ? err.message : "Não foi possível resolver.")
    }
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (open) return
        form.reset()
        onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver contestação</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "O cliente recebe por e-mail o resultado e a sua resposta."
              : `As ${count} contestações abertas desta pergunta são resolvidas juntas; cada cliente recebe por e-mail o resultado e a sua resposta.`}{" "}
            Se for corrigir, edite a pergunta antes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="gap-2">
                      <label
                        htmlFor="resolution-corrected"
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[[data-state=checked]]:border-primary"
                      >
                        <RadioGroupItem value="corrected" id="resolution-corrected" />
                        Procedente — a pergunta foi corrigida
                      </label>
                      <label
                        htmlFor="resolution-dismissed"
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm has-[[data-state=checked]]:border-primary"
                      >
                        <RadioGroupItem value="dismissed" id="resolution-dismissed" />
                        Improcedente — a pergunta fica como está
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resposta ao cliente</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Ex.: conferimos no manual e ajustamos o gabarito." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" loading={resolveMutation.isPending}>
                Resolver
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
