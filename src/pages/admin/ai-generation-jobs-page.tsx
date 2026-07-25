import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAiGenerationJobs } from "@/features/ai-generation/ai-generation-api"

const PAGE_SIZE = 20

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

export function AiGenerationJobsPage() {
  const { data, isPending, isError } = useAiGenerationJobs({ page: 1, pageSize: PAGE_SIZE })

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Geração de Questões por IA</h1>
          <p className="text-sm text-muted-foreground">
            Gere questões automaticamente a partir de uma prova de referência e um material de estudo.
          </p>
        </div>
        <Button asChild>
          <Link to="/painel/geracao-ia/novo">Nova geração</Link>
        </Button>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar o histórico de jobs.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Matéria</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Questões</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhum job de geração ainda.
                </TableCell>
              </TableRow>
            )}
            {data.items.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-medium">
                  <Link to={`/painel/geracao-ia/${job.id}`} className="hover:underline">
                    {job.subject_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{job.material_name}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[job.status]}>{STATUS_LABEL[job.status]}</Badge>
                </TableCell>
                <TableCell>
                  {job.question_count_generated ?? "—"} / {job.question_count_requested}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(job.created_at).toLocaleString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
