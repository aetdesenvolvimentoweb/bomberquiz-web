import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useSession } from "./use-session"
import { LoadingScreen } from "@/components/loading-screen"
import { SessionErrorScreen } from "@/components/session-error-screen"

/** Bloqueia rotas autenticadas para quem não tem sessão ativa. */
export function RequireAuth() {
  const { user, isPending, isError, refetch } = useSession()
  const location = useLocation()

  if (isPending) return <LoadingScreen />
  if (isError) return <SessionErrorScreen onRetry={refetch} />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return <Outlet />
}

/** Impede usuário já logado de ver telas de login/cadastro/recuperação. */
export function RequireGuest() {
  const { user, isPending, isError, refetch } = useSession()

  if (isPending) return <LoadingScreen />
  if (isError) return <SessionErrorScreen onRetry={refetch} />
  if (user) return <Navigate to="/inicio" replace />

  return <Outlet />
}

/** PROF-RF-006 CA-2: força reaceite de termos antes de liberar qualquer outra rota autenticada. */
export function ConsentGate() {
  const { requiresConsentRenewal, isPending, isError, refetch } = useSession()
  const location = useLocation()

  if (isPending) return <LoadingScreen />
  if (isError) return <SessionErrorScreen onRetry={refetch} />
  if (requiresConsentRenewal && location.pathname !== "/consentimento") {
    return <Navigate to="/consentimento" replace />
  }

  return <Outlet />
}

/** Bloqueia rotas /admin/* para quem não tem role="admin" (Módulo 3 — Conteúdo). */
export function RequireAdmin() {
  const { user, isPending, isError, refetch } = useSession()

  if (isPending) return <LoadingScreen />
  if (isError) return <SessionErrorScreen onRetry={refetch} />
  if (user?.role !== "admin") return <Navigate to="/inicio" replace />

  return <Outlet />
}
