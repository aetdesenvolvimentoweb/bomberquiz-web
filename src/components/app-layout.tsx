import { NavShell, type NavItem } from "@/components/nav-shell"
import { useSession } from "@/features/session/use-session"

// Header do app autenticado (fora do /painel): mostra o link do painel
// administrativo apenas para usuários com role "admin".
export function AppLayout() {
  const { user } = useSession()

  const navItems: NavItem[] = [
    { to: "/quiz/iniciar", label: "Quiz" },
    ...(user?.role === "admin" ? [{ to: "/painel/eixos", label: "Painel administrativo" }] : []),
  ]

  return <NavShell navItems={navItems} />
}
