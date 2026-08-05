import { useEffect } from "react"
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { useServiceWorkerUpdate } from "@/features/pwa/use-service-worker-update"
import { ApiError } from "@/lib/api/errors"
import { SESSION_QUERY_KEY } from "@/features/session/use-session"
import { router } from "./router"

// PROF-RF-010 (política de sessão única): qualquer chamada autenticada, em
// qualquer tela, pode voltar 401 "session_replaced" se este dispositivo foi
// desconectado por um login em outro lugar. Centralizado aqui em vez de em
// cada tela para cobrir automaticamente toda query/mutation do app.
function handleSessionReplaced(error: unknown) {
  if (error instanceof ApiError && error.code === "session_replaced") {
    queryClient.setQueryData(SESSION_QUERY_KEY, { user: null, requiresConsentRenewal: false })
    toast.error(error.message)
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({ onError: handleSessionReplaced }),
  mutationCache: new MutationCache({ onError: handleSessionReplaced }),
})

function ServiceWorkerUpdateToast() {
  const { needRefresh, dismiss, updateServiceWorker } = useServiceWorkerUpdate()

  useEffect(() => {
    if (!needRefresh) return

    const toastId = toast("Nova versão disponível", {
      action: {
        label: "Atualizar",
        onClick: () => updateServiceWorker(),
      },
      onDismiss: dismiss,
      duration: Infinity,
    })

    return () => {
      toast.dismiss(toastId)
    }
  }, [needRefresh, dismiss, updateServiceWorker])

  return null
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
      <ServiceWorkerUpdateToast />
    </QueryClientProvider>
  )
}
