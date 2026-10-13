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
