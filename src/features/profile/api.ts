import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { unwrap } from "@/lib/api/errors"
import { SESSION_QUERY_KEY } from "@/features/session/use-session"
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
