import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSubjects } from "@/features/content/subjects-api"
import { useCreateAiGenerationJob } from "@/features/ai-generation/ai-generation-api"
import { createJobFormSchema, type CreateJobFormValues } from "@/features/ai-generation/schemas"
import { ApiError } from "@/lib/api/errors"
import { AiGenerationPdfPicker } from "./ai-generation-pdf-picker"

export function AiGenerationNewJobPage() {
  const navigate = useNavigate()
  const createMutation = useCreateAiGenerationJob()

  // Só matérias ativas são elegíveis, mesmo critério de QuestionFormDialog.
  const { data: subjectsData } = useSubjects({ status: "active", page: 1, pageSize: 100 })

  const [referencePdf, setReferencePdf] = useState<File | null>(null)
  const [materialPdf, setMaterialPdf] = useState<File | null>(null)

  const form = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobFormSchema),
    defaultValues: { subjectId: "", questionCount: 10 },
  })

  async function onSubmit(values: CreateJobFormValues) {
    if (!referencePdf || !materialPdf) {
      toast.error("Selecione os dois arquivos PDF (prova de referência e material de estudo).")
      return
    }

    try {
      const result = await createMutation.mutateAsync({
        subjectId: values.subjectId,
        questionCount: values.questionCount,
        referencePdf,
        materialPdf,
      })
      toast.success("Job de geração criado — acompanhe o progresso.")
      navigate(`/painel/geracao-ia/${result.job_id}`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível criar o job de geração."
      toast.error(message)
    }
  }

  const subjectOptions = subjectsData?.items ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova geração de questões</h1>
        <p className="text-sm text-muted-foreground">
          Envie uma prova de referência (estilo/formato) e um material de estudo (conteúdo) para gerar questões
          automaticamente.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matéria</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma matéria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subjectOptions.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.axis_name} — {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="questionCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade de questões</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} max={30} step={1} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <AiGenerationPdfPicker label="Prova de referência (PDF)" file={referencePdf} onChange={setReferencePdf} />
          <AiGenerationPdfPicker label="Material de estudo (PDF)" file={materialPdf} onChange={setMaterialPdf} />

          <Button type="submit" loading={createMutation.isPending}>
            Iniciar geração
          </Button>
        </form>
      </Form>
    </div>
  )
}
