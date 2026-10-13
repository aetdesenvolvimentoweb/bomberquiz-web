const TIME_ZONE = "America/Sao_Paulo"

/**
 * Fim de vigência com a hora: "20/10/2026 às 14h" (ou "às 14h05").
 *
 * O acesso termina no mesmo horário em que começou, N×24h depois — mostrar só a
 * data faz "13/10 a 20/10" parecer 8 dias quando são 7. A hora deixa claro que
 * o primeiro e o último dia são parciais.
 */
export function formatDateWithTime(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString("pt-BR", { timeZone: TIME_ZONE })
  const [hours, minutes] = date
    .toLocaleTimeString("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":")
  return `${day} às ${Number(hours)}h${minutes === "00" ? "" : minutes}`
}

// Brasília é UTC-3 o ano todo desde 2019 (mesma premissa da API, courtesy-rules.ts).
const BRASILIA_OFFSET = "-03:00"

/** "2026-10-31" (de um <input type="date">) → início desse dia em Brasília, ISO. */
export function startOfDayInBrasilia(day: string): string {
  return `${day}T00:00:00.000${BRASILIA_OFFSET}`
}

/** "2026-10-31" → último milissegundo desse dia em Brasília: "válido até 31/10" inclui o dia 31. */
export function endOfDayInBrasilia(day: string): string {
  return `${day}T23:59:59.999${BRASILIA_OFFSET}`
}

/** ISO → "2026-10-31" no calendário de Brasília, para preencher um <input type="date">. */
export function toDateInputInBrasilia(iso: string): string {
  // en-CA formata como AAAA-MM-DD.
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TIME_ZONE })
}
