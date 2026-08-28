import { Navigate } from "react-router-dom"
import { useSession } from "@/features/session/use-session"
import { LoadingScreen } from "@/components/loading-screen"
import { VitrinePage } from "./vitrine-page"

/**
 * A raiz atende dois públicos opostos. Quem tem sessão vai direto para o app —
 * inclusive quem abriu o PWA instalado, que aterrissa em `/inicio` por
 * `start_url` (ver `vite.config.ts`). Quem não tem passa a ver a vitrine, em vez
 * de ser mandado para o formulário de senha: um visitante que ainda não conhece
 * o produto não tem o que fazer numa tela de login.
 */
export function IndexRedirectPage() {
  const { user, isPending } = useSession()

  if (isPending) return <LoadingScreen />
  if (user) return <Navigate to="/inicio" replace />
  return <VitrinePage />
}
