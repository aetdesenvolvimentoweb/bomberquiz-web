import { useState } from "react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

export function HistoryPage() {
  const [mode, setMode] = useState<QuizHistoryFilters["mode"] | "all">("all")
  const [status, setStatus] = useState<string>("all")
  const [startedFrom, setStartedFrom] = useState("")
  const [startedTo, setStartedTo] = useState("")
  const [page, setPage] = useState(1)

  const { data, isPending, isError } = useQuizHistory({
    mode: mode === "all" ? undefined : mode,
    status: status === "all" ? undefined : status,
    startedFrom: startedFrom || undefined,
    startedTo: startedTo || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="text-sm text-muted-foreground">Seus quizzes anteriores.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="w-auto"
        />
        <Input
          type="date"
          aria-label="Até"
          value={startedTo}
          onChange={(e) => {
            setStartedTo(e.target.value)
            setPage(1)
          }}
          className="w-auto"
        />
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar o histórico.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modo</TableHead>
                <TableHead>Matéria/Eixo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Acertos</TableHead>
                <TableHead className="text-right">Aproveitamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhum quiz encontrado.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{MODE_LABELS[item.mode] ?? item.mode}</TableCell>
                  <TableCell className="text-muted-foreground">{item.scope_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[item.status] ?? "secondary"}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(item.started_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right">
                    {item.correct_count}/{item.total_questions}
                  </TableCell>
                  <TableCell className="text-right">{Math.round(item.accuracy * 100)}%</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/quiz/${item.id}/resultado`}>Ver resultado</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

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
