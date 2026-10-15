import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { apiErrorFrom, unwrap } from "@/lib/api/errors"
import { env } from "@/lib/env"
import { SESSION_QUERY_KEY, type SessionUser } from "@/features/session/use-session"
import type { UpdateProfileFormValues } from "./schemas"

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: UpdateProfileFormValues) =>
      unwrap(
        apiClient.PATCH("/me/profile", {
          body: values,
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      unwrap(
        apiClient.POST("/me/password", {
          body: { current_password: values.currentPassword, new_password: values.newPassword },
        }),
      ),
  })
}

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: (newEmail: string) =>
      unwrap(apiClient.POST("/me/email", { body: { new_email: newEmail } })),
  })
}

export function useConfirmEmailChange() {
  return useMutation({
    mutationFn: (token: string) =>
      unwrap(apiClient.GET("/me/email/confirm", { params: { query: { token } } })),
  })
}

export function useAcceptConsent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => unwrap(apiClient.POST("/me/consent")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

export function useDeactivateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (password: string) => unwrap(apiClient.POST("/me/deactivate", { body: { password } })),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, { user: null, requiresConsentRenewal: false })
      queryClient.clear()
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (password: string) => unwrap(apiClient.DELETE("/me", { body: { password } })),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, { user: null, requiresConsentRenewal: false })
      queryClient.clear()
    },
  })
}

// PROF-RF-005 — avatar (multipart). Fora do contrato tipado do openapi-fetch,
// como o upload de imagem de pergunta (features/content/questions-api.ts).
async function avatarRequest(method: "POST" | "DELETE", body?: FormData): Promise<{ user: SessionUser }> {
  const res = await fetch(`${env.API_BASE_URL}/me/avatar`, { method, credentials: "include", body })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw apiErrorFrom(res.status, json)
  return json as { user: SessionUser }
}

function useAvatarMutation<TVariables>(request: (variables: TVariables) => Promise<{ user: SessionUser }>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: request,
    // A resposta já traz o usuário atualizado: a foto troca no menu na hora,
    // sem esperar o refetch de /me.
    onSuccess: ({ user }) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, (current: { user: SessionUser | null; requiresConsentRenewal: boolean } | undefined) =>
        current ? { ...current, user } : current,
      )
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

export function useUploadAvatar() {
  return useAvatarMutation((image: Blob) => {
    const form = new FormData()
    form.append("file", image, image.type === "image/webp" ? "avatar.webp" : "avatar.jpg")
    return avatarRequest("POST", form)
  })
}

export function useRemoveAvatar() {
  return useAvatarMutation(() => avatarRequest("DELETE"))
}
