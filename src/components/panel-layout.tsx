import { NavShell, type NavEntry } from "@/components/nav-shell"
import { useOpenQuestionReportsCount } from "@/features/quiz/question-reports-api"

function panelNavItems(openReports: number): NavEntry[] {
  return [
    {
      label: "Quiz",
      items: [
        { to: "/painel/eixos", label: "Eixos" },
        { to: "/painel/materias", label: "Matérias" },
        { to: "/painel/perguntas", label: "Perguntas" },
        { to: "/painel/revisao", label: "Revisão" },
        // QUIZ-RF-011: o número é de perguntas com contestação aberta.
        { to: "/painel/contestacoes", label: "Contestações", badge: openReports },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { to: "/painel/movimentacoes", label: "Movimentações" },
        { to: "/painel/planos", label: "Planos" },
        { to: "/painel/cortesias", label: "Cortesias" },
        { to: "/painel/cupons", label: "Cupons" },
      ],
    },
    { to: "/painel/usuarios", label: "Usuários" },
  ]
}

// Header da área administrativa (/painel/*).
export function PanelLayout() {
  const openReports = useOpenQuestionReportsCount()
  return <NavShell navItems={panelNavItems(openReports)} />
}
