import { NavShell, type NavItem } from "@/components/nav-shell"

const PARTNER_NAV_ITEMS: NavItem[] = [
  { to: "/parceiro/perguntas", label: "Minhas perguntas" },
]

// Header da área do parceiro (/parceiro/*).
export function PartnerLayout() {
  return <NavShell navItems={PARTNER_NAV_ITEMS} />
}
