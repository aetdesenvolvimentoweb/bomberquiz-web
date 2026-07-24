import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"

// Catálogo enxuto (só eixos/matérias ativos) para popular seletores da tela
// de iniciar quiz — diferente de features/content/{axes,subjects}-api.ts, que
// consomem /admin/* (RBAC admin) para a área de gestão de conteúdo.

const CATALOG_PAGE_SIZE = 100

export function useActiveAxes() {
  return useQuery({
    queryKey: ["catalog", "axes"],
    queryFn: () => unwrap(apiClient.GET("/axes", { params: { query: { page: 1, page_size: CATALOG_PAGE_SIZE } } })),
  })
}

// axisId é um filtro opcional (não usado pela tela de iniciar quiz hoje —
// free_subject lista todas as matérias ativas — mas mantido pois o backend
// já suporta e histórico/admin podem querer filtrar por eixo futuramente).
export function useActiveSubjects(axisId?: string) {
  return useQuery({
    queryKey: ["catalog", "subjects", axisId],
    queryFn: () =>
      unwrap(
        apiClient.GET("/subjects", {
          params: { query: { page: 1, page_size: CATALOG_PAGE_SIZE, axis_id: axisId } },
        }),
      ),
  })
}
