import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { UserAvatar } from "@/components/user-avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminUserDetail, type RecentSubscription } from "@/features/users/users-admin-api"
import { ApiError } from "@/lib/api/errors"
import { formatDateWithTime } from "@/lib/dates"
import { ChangeRoleDialog, ROLE_LABELS, STATUS_LABELS, type RoleAction } from "./change-role-dialog"
import { GrantCourtesyDialog } from "./grant-courtesy-dialog"

const SOURCE_LABELS: Record<RecentSubscription["source"], string> = {
  paid: "Paga",
  courtesy: "Cortesia",
  trial: "Teste grátis",
}

const SUBSCRIPTION_STATUS_LABELS: Record<RecentSubscription["status"], string> = {
  active: "Ativa",
  expired: "Expirada",
  revoked: "Revogada",
  pending_payment: "Aguardando pagamento",
}

const CATEGORY_LABELS: Record<NonNullable<RecentSubscription["courtesy_category"]>, string> = {
  parceria: "Parceria",
  demonstracao: "Demonstração",
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"
}

function describeSubscription(subscription: RecentSubscription): string {
  if (subscription.plan_name) return subscription.plan_name
  if (subscription.courtesy_category) return CATEGORY_LABELS[subscription.courtesy_category]
  return "—"
}

function currentYearInBrasilia(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric" })
}

// PROF-RF-014 — o contexto para decidir promoção, revogação ou cortesia, com
// as próprias ações à mão.
export function UserDetailPage() {
  const { id = "" } = useParams()
  const { data: user, isPending, error } = useAdminUserDetail(id)
  const [roleAction, setRoleAction] = useState<RoleAction | null>(null)
  const [courtesyOpen, setCourtesyOpen] = useState(false)

  const backLink = (
    <Link to="/painel/usuarios" className="text-sm text-muted-foreground hover:underline">
      ← Usuários
    </Link>
  )

  if (isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  if (error || !user) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        {backLink}
        <p className="text-sm text-destructive">
          {notFound ? "Usuário não encontrado." : "Não foi possível carregar o usuário."}
        </p>
      </div>
    )
  }

  const { access, recent_subscriptions: subscriptions, courtesies_received_this_year: courtesies } = user.contract

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {backLink}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatar_url} size={64} className="h-16 w-16 text-lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant={user.role === "client" ? "secondary" : user.role === "partner" ? "success" : "default"}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <Badge variant="outline">Conta {STATUS_LABELS[user.status].toLowerCase()}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastro em {formatDate(user.created_at)} · Último login {formatDate(user.last_login_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.role === "client" && user.status === "active" && (
            <Button variant="outline" onClick={() => setRoleAction({ user, role: "partner" })}>
              Tornar parceiro
            </Button>
          )}
          {user.role === "partner" && (
            <Button variant="outline" onClick={() => setRoleAction({ user, role: "client" })}>
              Revogar parceiro
            </Button>
          )}
          {user.status === "active" && <Button onClick={() => setCourtesyOpen(true)}>Conceder cortesia</Button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Acesso</CardDescription>
            <CardTitle className="text-lg">
              {access.status === "active" && access.active_until
                ? `Ativo até ${formatDateWithTime(access.active_until)}`
                : "Sem acesso"}
            </CardTitle>
          </CardHeader>
          {access.status === "active" && access.source && (
            <CardContent className="text-sm text-muted-foreground">{SOURCE_LABELS[access.source]}</CardContent>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Cortesias recebidas em {currentYearInBrasilia()}</CardDescription>
            <CardTitle className="text-lg">{courtesies}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <Link to="/painel/cortesias" className="text-muted-foreground hover:underline">
              Ver cortesias
            </Link>
          </CardContent>
        </Card>
        {/* QUIZ-RF-011 CA-10: medidor do parceiro — perguntas dele corrigidas
            depois de uma contestação procedente. */}
        {user.content_reports && (
          <Card>
            <CardHeader>
              <CardDescription>Perguntas corrigidas após contestação</CardDescription>
              <CardTitle className="text-lg">{user.content_reports.questions_corrected_after_report}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {user.content_reports.questions_with_open_reports === 0
                ? "Nenhuma em análise agora."
                : `${user.content_reports.questions_with_open_reports} em análise agora.`}{" "}
              <Link to="/painel/contestacoes" className="hover:underline">
                Ver contestações
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Últimas assinaturas</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Plano ou categoria</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Nenhuma assinatura.
                </TableCell>
              </TableRow>
            )}
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>{SOURCE_LABELS[subscription.source]}</TableCell>
                <TableCell className="text-muted-foreground">{describeSubscription(subscription)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(subscription.start_at)} a {formatDate(subscription.end_at)}
                </TableCell>
                <TableCell>{SUBSCRIPTION_STATUS_LABELS[subscription.status]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ChangeRoleDialog action={roleAction} onClose={() => setRoleAction(null)} />
      <GrantCourtesyDialog open={courtesyOpen} onOpenChange={setCourtesyOpen} initialEmail={user.email} />
    </div>
  )
}
