import { useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { useServiceWorkerUpdate } from "@/features/pwa/use-service-worker-update"
import { router } from "./router"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
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
