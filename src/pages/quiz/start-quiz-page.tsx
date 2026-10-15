import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Mascot } from "@/components/mascot"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useActiveAxes, useActiveSubjects } from "@/features/content/catalog-api"
import { useStartQuiz } from "@/features/quiz/quiz-api"
import { startQuizFormSchema, type StartQuizFormValues } from "@/features/quiz/schemas"
import { useMySubscription } from "@/features/subscription/subscription-api"
import { ApiError } from "@/lib/api/errors"

const SIZE_OPTIONS = [10, 20, 30, 50] as const

// Cronômetro e justificativa são hábitos de quem estuda, não escolhas de cada
// quiz: lembrados neste navegador a cada início bem-sucedido. Modo e matéria
// não entram — esses mudam de um treino para o outro.
const PREFERENCES_STORAGE_KEY = "bq.quiz.preferences"

type QuizPreferences = Pick<StartQuizFormValues, "timerEnabled" | "timePerQuestionSeconds" | "explanationMode">

const DEFAULT_PREFERENCES: QuizPreferences = {
  timerEnabled: false,
  timePerQuestionSeconds: 180,
  explanationMode: "after_each",
}

function loadPreferences(): QuizPreferences {
  try {
    const parsed = startQuizFormSchema.innerType().pick({
      timerEnabled: true,
      timePerQuestionSeconds: true,
      explanationMode: true,
    }).safeParse(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "null"))
    return parsed.success ? parsed.data : DEFAULT_PREFERENCES
  } catch {
    // Armazenamento bloqueado (aba anônima, dados limpos): fica no padrão.
    return DEFAULT_PREFERENCES
  }
}

function savePreferences({ timerEnabled, timePerQuestionSeconds, explanationMode }: StartQuizFormValues) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ timerEnabled, timePerQuestionSeconds, explanationMode }))
  } catch {
    // Sem armazenamento, só não lembra da próxima vez.
  }
}

const MODE_OPTIONS = [
  { value: "tap_simulation", title: "Simulado TAP", description: "Monta o simulado completo, seguindo o peso de cada eixo no edital." },
  { value: "free_subject", title: "Livre por matéria", description: "Escolha uma matéria e o número de questões." },
  { value: "free_axis", title: "Livre por eixo", description: "Escolha um eixo temático e o número de questões." },
] as const

export function StartQuizPage() {
  const { data: subscription } = useMySubscription()

  // Sem acesso, o POST /quizzes recusa com 402 — e o cliente só descobria isso
  // depois de montar o quiz inteiro e clicar. Melhor dizer antes.
  if (subscription?.access_status === "inactive") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <Mascot pose="encouraging" alt="" className="w-[110px] sm:w-[130px]" />
        <div>
          <h1 className="text-xl font-semibold">Seu acesso ao quiz está bloqueado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Assine um plano para voltar a treinar.</p>
        </div>
        <Button asChild>
          <Link to="/planos">Assinar um plano</Link>
        </Button>
      </div>
    )
  }

  return <StartQuizForm />
}

function StartQuizForm() {
  const navigate = useNavigate()
  const startQuizMutation = useStartQuiz()
  const { data: axesData, isPending: axesPending } = useActiveAxes()
  const { data: subjectsData, isPending: subjectsPending } = useActiveSubjects()

  // Atalho da tela inicial ("Treinar esta matéria"): chega já em livre por
  // matéria, com a matéria e 10 questões marcadas. Só pré-preenche — o
  // formulário continua editável, e um id que não exista mais simplesmente não
  // aparece selecionado no seletor (a validação pede para escolher).
  const [searchParams] = useSearchParams()
  const presetSubjectId =
    searchParams.get("modo") === "free_subject" ? (searchParams.get("materia") ?? "") : ""

  const form = useForm<StartQuizFormValues>({
    resolver: zodResolver(startQuizFormSchema),
    defaultValues: {
      mode: presetSubjectId ? "free_subject" : "tap_simulation",
      ...(presetSubjectId && { size: 10 }),
      subjectId: presetSubjectId,
      axisId: "",
      ...loadPreferences(),
    },
  })

  const mode = form.watch("mode")
  const size = form.watch("size")
  const timerEnabled = form.watch("timerEnabled")
  const timePerQuestionSeconds = form.watch("timePerQuestionSeconds")
  const explanationMode = form.watch("explanationMode")
  const axisOptions = axesData?.items ?? []
  const subjectOptions = subjectsData?.items ?? []

  // O simulado tem o tamanho da prova: a soma dos pesos dos eixos ativos
  // (QUIZ-RF-001). Antes de os eixos chegarem, o resumo só omite o número.
  const tapSize = axesData ? axisOptions.reduce((sum, axis) => sum + axis.tap_weight, 0) : undefined
  const questionCount = mode === "tap_simulation" ? tapSize : size
  const summary = [
    questionCount ? `${questionCount} questões` : null,
    timerEnabled && questionCount
      ? `${Math.round((questionCount * timePerQuestionSeconds) / 60)} min no cronômetro`
      : timerEnabled
        ? null
        : "sem cronômetro",
    explanationMode === "after_each" ? "explicação após cada questão" : "explicações no final",
  ].filter(Boolean)

  async function onSubmit(values: StartQuizFormValues) {
    try {
      const result = await startQuizMutation.mutateAsync(values)
      savePreferences(values)
      navigate(`/quiz/${result.quiz_id}`, { state: { startPayload: result } })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível iniciar o quiz."
      toast.error(message)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Iniciar quiz</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha o modo e as preferências para começar.</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modo</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                    {MODE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        htmlFor={`mode-${option.value}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary"
                      >
                        <RadioGroupItem value={option.value} id={`mode-${option.value}`} className="mt-1" />
                        <div>
                          <p className="font-medium">{option.title}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "free_subject" && (
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matéria</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={subjectsPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={subjectsPending ? "Carregando…" : "Selecione uma matéria"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjectOptions.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!subjectsPending && subjectOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma matéria disponível no momento.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {mode === "free_axis" && (
            <FormField
              control={form.control}
              name="axisId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eixo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={axesPending}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={axesPending ? "Carregando…" : "Selecione um eixo"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {axisOptions.map((axis) => (
                        <SelectItem key={axis.id} value={axis.id}>
                          {axis.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!axesPending && axisOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum eixo disponível no momento.</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(mode === "free_subject" || mode === "free_axis") && (
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de questões</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value?.toString() ?? ""}
                      onValueChange={(v) => field.onChange(Number(v))}
                      className="grid-flow-col gap-2"
                    >
                      {SIZE_OPTIONS.map((size) => (
                        <label
                          key={size}
                          htmlFor={`size-${size}`}
                          className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary"
                        >
                          <RadioGroupItem value={size.toString()} id={`size-${size}`} />
                          {size}
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cronômetro</CardTitle>
              <CardDescription>Tempo total para o quiz inteiro, opcional.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="timerEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0">
                    <FormLabel className="!mt-0">Cronômetro</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {timerEnabled && (
                <FormField
                  control={form.control}
                  name="timePerQuestionSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{Math.round(field.value / 60)} min por questão</FormLabel>
                      <FormControl>
                        <Slider
                          min={60}
                          max={300}
                          step={30}
                          value={[field.value]}
                          onValueChange={([v]) => field.onChange(v)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <FormField
            control={form.control}
            name="explanationMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Justificativa</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-2">
                    <label htmlFor="explanation-after_each" className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary">
                      <RadioGroupItem value="after_each" id="explanation-after_each" />
                      Ver explicação após cada questão
                    </label>
                    <label htmlFor="explanation-at_end" className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary">
                      <RadioGroupItem value="at_end" id="explanation-at_end" />
                      Ver todas no final
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            {/* O que o clique abaixo vai pôr na frente do cliente, num relance. */}
            <p className="mb-2 text-center text-sm text-muted-foreground">
              {summary.join(" · ")}
            </p>
            <Button type="submit" loading={startQuizMutation.isPending} className="w-full">
              Iniciar quiz
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
