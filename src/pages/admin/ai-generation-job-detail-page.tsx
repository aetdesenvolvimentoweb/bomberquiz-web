import { useParams } from "react-router-dom"

// Fatia 1 (fundação): placeholder — o acompanhamento com polling (Fatia 3) e a
// revisão de questões geradas (Fatia 5) chegam nas próximas fatias, ver
// espec/docs/rf/ai-generation-ui-plano-implementacao.md.
export function AiGenerationJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()

  return (
    <div className="mx-auto max-w-2xl space-y-2 p-6">
      <h1 className="text-2xl font-semibold">Job de geração</h1>
      <p className="text-sm text-muted-foreground">Em construção (job {jobId}).</p>
    </div>
  )
}
