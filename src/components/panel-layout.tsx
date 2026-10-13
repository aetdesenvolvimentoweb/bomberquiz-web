import { NavShell, type NavEntry } from "@/components/nav-shell"

const PANEL_NAV_ITEMS: NavEntry[] = [
  {
    label: "Quiz",
    items: [
      { to: "/painel/eixos", label: "Eixos" },
      { to: "/painel/materias", label: "Matérias" },
      { to: "/painel/perguntas", label: "Perguntas" },
      { to: "/painel/revisao", label: "Revisão" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { to: "/painel/movimentacoes", label: "Movimentações" },
      { to: "/painel/planos", label: "Planos" },
    ],
  },
  { to: "/painel/usuarios", label: "Usuários" },
]

// Header da área administrativa (/painel/*).
export function PanelLayout() {
  return <NavShell navItems={PANEL_NAV_ITEMS} />
}
