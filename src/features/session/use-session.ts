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

  // Sem sessão ativa é um estado válido (usuário deslogado), não um erro de carregamento.
  if (response.status === 401) {
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
    staleTime: 60_000,
  })

  return {
    user: query.data?.user ?? null,
    requiresConsentRenewal: query.data?.requiresConsentRenewal ?? false,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  }
}
