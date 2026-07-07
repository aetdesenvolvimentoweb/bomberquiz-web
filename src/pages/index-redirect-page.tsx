import { Navigate } from "react-router-dom"
import { useSession } from "@/features/session/use-session"
import { LoadingScreen } from "@/components/loading-screen"

export function IndexRedirectPage() {
  const { user, isPending } = useSession()

  if (isPending) return <LoadingScreen />
  return <Navigate to={user ? "/inicio" : "/login"} replace />
}
