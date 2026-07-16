import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiClient } from "@/lib/api/client"
import { ApiError, unwrap } from "@/lib/api/errors"
import { SESSION_QUERY_KEY } from "@/features/session/use-session"
import type { RegisterFormValues } from "./schemas"

export function useRegister() {
  return useMutation({
    mutationFn: (values: RegisterFormValues) =>
      unwrap(
        apiClient.POST("/auth/register", {
          body: {
            name: values.name,
            email: values.email,
            phone: values.phone,
            dob: values.dob,
            sex: values.sex,
            password: values.password,
            consent_version: 1,
          },
        }),
      ),
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: { email: string; password: string }) =>
      unwrap(apiClient.POST("/auth/login", { body: values })),
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, {
        user: data.user,
        requiresConsentRenewal: data.requires_consent_renewal,
      })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => unwrap(apiClient.POST("/auth/logout")),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, { user: null, requiresConsentRenewal: false })
      queryClient.clear()
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : "Não foi possível sair. Tente novamente."
      toast.error(message)
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => unwrap(apiClient.POST("/auth/forgot-password", { body: { email } })),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; newPassword: string }) =>
      unwrap(
        apiClient.POST("/auth/reset-password", {
          body: { token: input.token, new_password: input.newPassword },
        }),
      ),
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) => unwrap(apiClient.POST("/auth/resend-verification", { body: { email } })),
  })
}
