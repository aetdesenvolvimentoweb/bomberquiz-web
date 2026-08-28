import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import type { paths } from "@/lib/api/schema"

export type FinancialOverview =
  paths["/admin/financial/overview"]["get"]["responses"][200]["content"]["application/json"]

export type AdminPayment =
  paths["/admin/payments"]["get"]["responses"][200]["content"]["application/json"]["items"][number]

export interface FinancialPeriod {
  /** `YYYY-MM-DD`. */
  from: string
  to: string
}

export interface AdminPaymentsFilters extends Partial<FinancialPeriod> {
  status?: AdminPayment["status"]
  method?: AdminPayment["method"]
  search?: string
  page: number
  pageSize: number
}

export function useFinancialOverview(period: FinancialPeriod) {
  return useQuery({
    queryKey: ["subscription", "financial-overview", period],
    queryFn: () =>
      unwrap(apiClient.GET("/admin/financial/overview", { params: { query: { from: period.from, to: period.to } } })),
  })
}

export function useAdminPayments(filters: AdminPaymentsFilters) {
  return useQuery({
    queryKey: ["subscription", "admin-payments", filters],
    queryFn: () => unwrap(apiClient.GET("/admin/payments", { params: { query: toQuery(filters) } })),
  })
}

/**
 * Busca **todas** as páginas do período/filtro corrente, para a exportação CSV.
 * Fora do React Query de propósito: é uma ação pontual disparada por clique, não
 * um estado de tela para manter em cache — e cachear N páginas de uma
 * exportação só serviria para segurar memória do que ninguém vai reler.
 */
export async function fetchAllAdminPayments(
  filters: Omit<AdminPaymentsFilters, "page" | "pageSize">,
): Promise<AdminPayment[]> {
  const PAGE_SIZE = 100 // teto aceito pelo PaginationQuerySchema da API
  const todos: AdminPayment[] = []

  for (let page = 1; ; page++) {
    const resposta = await unwrap(
      apiClient.GET("/admin/payments", {
        params: { query: toQuery({ ...filters, page, pageSize: PAGE_SIZE }) },
      }),
    )
    todos.push(...resposta.items)
    // Para pelo total, não por "veio menos que a página": um total que encolhe
    // entre requisições (alguém estornando ao mesmo tempo) ainda encerra o laço.
    if (todos.length >= resposta.total || resposta.items.length === 0) break
  }

  return todos
}

function toQuery(filters: AdminPaymentsFilters) {
  return {
    from: filters.from,
    to: filters.to,
    status: filters.status,
    method: filters.method,
    search: filters.search || undefined,
    page: filters.page,
    page_size: filters.pageSize,
  }
}
