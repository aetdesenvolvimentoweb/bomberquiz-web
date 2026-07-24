import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
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
import { ApiError } from "@/lib/api/errors"

const SIZE_OPTIONS = [10, 20, 30, 50] as const

const MODE_OPTIONS = [
  { value: "tap_simulation", title: "Simulado TAP", description: "Monta o simulado completo, seguindo o peso de cada eixo no edital." },
  { value: "free_subject", title: "Livre por matéria", description: "Escolha uma matéria e o número de questões." },
  { value: "free_axis", title: "Livre por eixo", description: "Escolha um eixo temático e o número de questões." },
] as const

export function StartQuizPage() {
  const navigate = useNavigate()
  const startQuizMutation = useStartQuiz()
  const { data: axesData, isPending: axesPending } = useActiveAxes()
  const { data: subjectsData, isPending: subjectsPending } = useActiveSubjects()

  const form = useForm<StartQuizFormValues>({
    resolver: zodResolver(startQuizFormSchema),
    defaultValues: {
      mode: "tap_simulation",
      subjectId: "",
      axisId: "",
      timerEnabled: false,
      timePerQuestionSeconds: 180,
      explanationMode: "after_each",
    },
  })

  const mode = form.watch("mode")
  const timerEnabled = form.watch("timerEnabled")
  const axisOptions = axesData?.items ?? []
  const subjectOptions = subjectsData?.items ?? []

  async function onSubmit(values: StartQuizFormValues) {
    try {
      const result = await startQuizMutation.mutateAsync(values)
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

          <Button type="submit" loading={startQuizMutation.isPending} className="w-full">
            Iniciar quiz
          </Button>
        </form>
      </Form>
    </div>
  )
}
