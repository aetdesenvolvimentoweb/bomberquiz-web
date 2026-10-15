import { useState } from "react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Mascot } from "@/components/mascot"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useQuizHistory, type QuizHistoryFilters } from "@/features/quiz/performance-api"

const PAGE_SIZE = 20

const MODE_LABELS: Record<string, string> = {
  tap_simulation: "Simulado TAP",
  free_subject: "Livre por matéria",
  free_axis: "Livre por eixo",
}

const STATUS_LABELS: Record<string, string> = {
  finished: "Finalizado",
  expired: "Tempo esgotado",
  abandoned: "Abandonado",
}

const STATUS_BADGE_VARIANT: Record<string, "success" | "destructive" | "secondary"> = {
  finished: "success",
  expired: "destructive",
  abandoned: "secondary",
}

// Mesmos cortes dos selos do desempenho (`statusBadge` em
// api/src/application/quiz/get-performance.usecase.ts): abaixo de 50% é
// fraco, a partir de 75% é forte. Dá para varrer a lista de olho.
function accuracyColor(accuracy: number) {
  if (accuracy >= 0.75) return "text-success"
  if (accuracy < 0.5) return "text-destructive"
  return ""
}

const SELECT_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function HistoryPage() {
  const [mode, setMode] = useState<QuizHistoryFilters["mode"] | "all">("all")
  const [status, setStatus] = useState<string>("all")
  const [startedFrom, setStartedFrom] = useState("")
  const [startedTo, setStartedTo] = useState("")
  const [page, setPage] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { data, isPending, isError } = useQuizHistory({
    mode: mode === "all" ? undefined : mode,
    status: status === "all" ? undefined : status,
    startedFrom: startedFrom || undefined,
    startedTo: startedTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  // Histórico vazio SEM filtro é "nunca fez um quiz" — merece convite, não uma
  // linha de tabela. Com filtro, vazio é só "nada nesse recorte", e a tabela
  // com a linha de aviso continua sendo a resposta certa.
  const activeFilterCount = [mode !== "all", status !== "all", startedFrom !== "", startedTo !== ""].filter(Boolean).length
  const hasFilters = activeFilterCount > 0
  const neverPlayed = data !== undefined && data.total === 0 && !hasFilters

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="text-sm text-muted-foreground">Seus quizzes anteriores.</p>
      </div>

      {/* No celular, quatro filtros empilhados empurravam a lista para baixo da
          dobra; ficam atrás de um botão. Do sm para cima, sempre à vista. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="sm:hidden"
        aria-expanded={filtersOpen}
        onClick={() => setFiltersOpen((open) => !open)}
      >
        {hasFilters ? `Filtrar (${activeFilterCount})` : "Filtrar"}
      </Button>

      <div className={(filtersOpen ? "grid grid-cols-2" : "hidden") + " gap-3 sm:flex sm:flex-wrap"}>
        <select
          className={SELECT_CLASS}
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as QuizHistoryFilters["mode"] | "all")
            setPage(1)
          }}
        >
          <option value="all">Todos os modos</option>
          <option value="tap_simulation">Simulado TAP</option>
          <option value="free_subject">Livre por matéria</option>
          <option value="free_axis">Livre por eixo</option>
        </select>
        <select
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="all">Todos os status</option>
          <option value="finished">Finalizado</option>
          <option value="expired">Tempo esgotado</option>
          <option value="abandoned">Abandonado</option>
        </select>
        <Input
          type="date"
          aria-label="De"
          value={startedFrom}
          onChange={(e) => {
            setStartedFrom(e.target.value)
            setPage(1)
          }}
          className="sm:w-auto"
        />
        <Input
          type="date"
          aria-label="Até"
          value={startedTo}
          onChange={(e) => {
            setStartedTo(e.target.value)
            setPage(1)
          }}
          className="sm:w-auto"
        />
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>}

      {neverPlayed && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Mascot pose="empty" alt="Mascote sentado, lendo um livro" className="w-[140px] sm:w-[160px]" />
          <div>
            <p className="font-medium">Seu primeiro quiz te espera</p>
            <p className="mt-1 text-sm text-muted-foreground">Os quizzes que você fizer aparecem aqui, com o resultado de cada um.</p>
          </div>
          <Button asChild>
            <Link to="/quiz/iniciar">Iniciar quiz</Link>
          </Button>
        </div>
      )}

      {data && !neverPlayed && (
        <>
          {/* Lista de cartões em vez de tabela: 7 colunas não cabiam no celular
              (PWA mobile-first) e viravam rolagem lateral. O cartão inteiro leva
              ao resultado, como a linha "Último quiz" da tela inicial. */}
          {data.items.length === 0 ? (
            <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">Nenhum quiz encontrado.</p>
          ) : (
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/quiz/${item.id}/resultado`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{item.scope_name ?? MODE_LABELS[item.mode] ?? item.mode}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                        {item.scope_name && <span>{MODE_LABELS[item.mode] ?? item.mode}</span>}
                        <span>{new Date(item.started_at).toLocaleDateString("pt-BR")}</span>
                        <Badge variant={STATUS_BADGE_VARIANT[item.status] ?? "secondary"}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block font-medium">
                        {item.correct_count}/{item.total_questions}
                      </span>
                      <span className={"block " + (accuracyColor(item.accuracy) || "text-muted-foreground")}>
                        {Math.round(item.accuracy * 100)}%
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  )
}
