import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { ApiError, apiErrorFrom } from "@/lib/api/errors"

export type SessionUser = {
  id: string
  name: string
  email: string
  phone: string
  dob: string
  sex: "masculino" | "feminino" | "prefere_nao_informar"
  avatarUrl: string | null
  emailVerifiedAt: string | null
  role: "client" | "partner" | "admin"
  status: "active" | "inactive" | "deleted"
  consentVersion: number
  trialUsedAt: string | null
  lastLoginAt: string | null
  createdAt: string
}

type SessionData = {
  user: SessionUser | null
  requiresConsentRenewal: boolean
}

export const SESSION_QUERY_KEY = ["session", "me"] as const

async function fetchSession(): Promise<SessionData> {
  const { data, error, response } = await apiClient.GET("/me")

  if (response.status === 401) {
    const apiError = error !== undefined ? apiErrorFrom(response.status, error) : null
    // "session_replaced" (PROF-RF-010) não é o estado normal de deslogado — precisa
    // virar erro de query para acionar o onError global (toast + limpeza de sessão
    // em web/src/app/app.tsx). Qualquer outro 401 é só "sem sessão ativa", estado válido.
    if (apiError?.code === "session_replaced") throw apiError
    return { user: null, requiresConsentRenewal: false }
  }
  if (error !== undefined) throw apiErrorFrom(response.status, error)
  if (!data) throw new ApiError(response.status, null)
  return { user: data.user, requiresConsentRenewal: data.requires_consent_renewal }
}

export function useSession() {
  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: fetchSession,
    retry: false,
    // 75s: PROF-RF-010 (sessão única) — cookieCache do Better-Auth
    // (better-auth.ts) só reconfere no banco a cada 60s; 75s garante que
    // cada refetch periódico normalmente já pega o cache expirado, então
    // "fui desconectado por outro dispositivo" aparece em ~75s no pior caso,
    // não em até 5min. Custo aceito: mais GET /me de fundo por aba aberta,
    // mas a maioria é respondida pelo próprio cache (sem ida ao Postgres).
    // refetchOnWindowFocus continua cobrindo o caso "voltei pra aba".
    staleTime: 75_000,
    refetchOnWindowFocus: true,
    refetchInterval: 75_000,
  })

  return {
    user: query.data?.user ?? null,
    requiresConsentRenewal: query.data?.requiresConsentRenewal ?? false,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  }
}
