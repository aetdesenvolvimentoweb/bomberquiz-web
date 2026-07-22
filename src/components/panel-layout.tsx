import { NavShell, type NavItem } from "@/components/nav-shell"

const PANEL_NAV_ITEMS: NavItem[] = [
  { to: "/painel/eixos", label: "Eixos" },
  { to: "/painel/materias", label: "Matérias" },
  { to: "/painel/perguntas", label: "Perguntas" },
  { to: "/painel/revisao", label: "Revisão" },
]

// Header da área administrativa (/painel/*).
export function PanelLayout() {
  return <NavShell navItems={PANEL_NAV_ITEMS} />
}
