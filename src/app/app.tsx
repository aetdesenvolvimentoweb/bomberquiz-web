import { useEffect } from "react"
import { QueryCache, QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { useServiceWorkerUpdate } from "@/features/pwa/use-service-worker-update"
import { ApiError } from "@/lib/api/errors"
import { SESSION_QUERY_KEY } from "@/features/session/use-session"
import { MY_SUBSCRIPTION_QUERY_KEY } from "@/features/subscription/subscription-api"
import { router } from "./router"

// Rotas "apenas visitante" (guards.tsx/RequireGuest) — se o 401 chegar aqui
// (ex: refresh na tela de login com o cookie antigo ainda no navegador), o
// usuário já está exatamente onde o redirecionamento levaria; avisar de novo
// só repetiria uma notícia que ele já recebeu.
const GUEST_ROUTES = ["/login", "/cadastro", "/esqueci-senha"]

// Mesma ideia para o paywall: já está em /planos, não repetir o aviso.
const SUBSCRIPTION_ROUTES = ["/planos"]

// PROF-RF-010 (política de sessão única): qualquer chamada autenticada, em
// qualquer tela, pode voltar 401 "session_replaced" se este dispositivo foi
// desconectado por um login em outro lugar. Centralizado aqui em vez de em
// cada tela para cobrir automaticamente toda query/mutation do app.
function handleSessionReplaced(error: unknown) {
  if (!(error instanceof ApiError) || error.code !== "session_replaced") return

  queryClient.setQueryData(SESSION_QUERY_KEY, { user: null, requiresConsentRenewal: false })

  if (GUEST_ROUTES.includes(window.location.pathname)) return

  // id fixo: navegar para uma nova página autenticada dispara, ao mesmo
  // tempo, o refetch da sessão e a query própria da página — ambas podem
  // voltar esse mesmo 401 quase simultaneamente. Com id fixo o sonner
  // atualiza o toast existente em vez de empilhar um segundo idêntico.
  toast.error(error.message, { id: "session-replaced" })
}

// SUB-RF-011 / QUIZ-RF-009: POST /quizzes e /quizzes/:id/answers voltam 402
// subscription_required quando trial/assinatura expiraram. Centralizado aqui
// pelo mesmo motivo de handleSessionReplaced acima — cobre qualquer tela que
// dispare essas chamadas sem cada uma precisar tratar o 402 manualmente.
function handleSubscriptionRequired(error: unknown) {
  if (!(error instanceof ApiError) || error.code !== "subscription_required") return

  queryClient.invalidateQueries({ queryKey: MY_SUBSCRIPTION_QUERY_KEY })

  if (SUBSCRIPTION_ROUTES.includes(window.location.pathname)) return

  toast.error(error.message, { id: "subscription-required" })
  router.navigate("/planos")
}

function handleGlobalQueryError(error: unknown) {
  handleSessionReplaced(error)
  handleSubscriptionRequired(error)
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({ onError: handleGlobalQueryError }),
  mutationCache: new MutationCache({ onError: handleGlobalQueryError }),
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
