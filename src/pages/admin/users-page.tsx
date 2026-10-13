import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  useAdminUsers,
  useChangeUserRole,
  type AdminUser,
  type UserRoleFilter,
  type UserStatusFilter,
} from "@/features/users/users-admin-api"
import { ApiError } from "@/lib/api/errors"

const PAGE_SIZE = 20

const ROLE_LABELS: Record<AdminUser["role"], string> = {
  client: "Cliente",
  partner: "Parceiro",
  admin: "Admin",
}

const STATUS_LABELS: Record<AdminUser["status"], string> = {
  active: "Ativa",
  inactive: "Inativa",
  deleted: "Excluída",
}

const SELECT_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"
}

type RoleAction = { user: AdminUser; role: "partner" | "client" }

// PROF-RF-011 a 013 — admin localiza usuários e promove cliente a parceiro ou
// revoga o papel. Admin não aparece com ação: entra e sai só pela whitelist.
export function UsersPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRoleFilter>("all")
  const [status, setStatus] = useState<UserStatusFilter>("all")
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<RoleAction | null>(null)
  const [reason, setReason] = useState("")

  const { data, isPending, isError } = useAdminUsers({
    email: email.trim() || undefined,
    name: name.trim() || undefined,
    role,
    status,
    page,
    pageSize: PAGE_SIZE,
  })
  const changeRoleMutation = useChangeUserRole()

  function openAction(next: RoleAction) {
    setReason("")
    setAction(next)
  }

  async function handleConfirm() {
    if (!action) return
    const { user, role: nextRole } = action
    try {
      await changeRoleMutation.mutateAsync({
        id: user.id,
        role: nextRole,
        reason: nextRole === "client" ? reason.trim() || undefined : undefined,
      })
      toast.success(
        nextRole === "partner" ? `${user.name} agora é parceiro.` : `${user.name} deixou de ser parceiro.`,
      )
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível alterar o papel do usuário."
      toast.error(message)
    } finally {
      setAction(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <p className="text-sm text-muted-foreground">Busque usuários para promover a parceiro ou revogar o papel.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="E-mail exato"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <Input
          placeholder="Nome começa com…"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
        <select
          aria-label="Papel"
          className={SELECT_CLASS}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as UserRoleFilter)
            setPage(1)
          }}
        >
          <option value="all">Todos os papéis</option>
          <option value="client">Cliente</option>
          <option value="partner">Parceiro</option>
          <option value="admin">Admin</option>
        </select>
        <select
          aria-label="Status"
          className={SELECT_CLASS}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as UserStatusFilter)
            setPage(1)
          }}
        >
          <option value="all">Ativas e inativas</option>
          <option value="active">Ativa</option>
          <option value="inactive">Inativa</option>
          <option value="deleted">Excluída</option>
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {isError && <p className="text-sm text-destructive">Não foi possível carregar os usuários.</p>}

      {data && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
              {data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "client" ? "secondary" : user.role === "partner" ? "success" : "default"}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{STATUS_LABELS[user.status]}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.last_login_at)}</TableCell>
                  <TableCell className="text-right">
                    {user.role === "client" && user.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => openAction({ user, role: "partner" })}>
                        Tornar parceiro
                      </Button>
                    )}
                    {user.role === "partner" && (
                      <Button size="sm" variant="outline" onClick={() => openAction({ user, role: "client" })}>
                        Revogar parceiro
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    aria-disabled={page <= 1}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-2 text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <AlertDialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action?.role === "partner" ? "Tornar parceiro?" : "Revogar papel de parceiro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action?.role === "partner"
                ? `${action.user.name} poderá cadastrar perguntas e enviá-las para revisão. A assinatura dele não muda.`
                : `${action?.user.name} volta a ser cliente. As perguntas que ele já cadastrou continuam no sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action?.role === "client" && (
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Motivo (opcional)</Label>
              <Textarea
                id="revoke-reason"
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {action?.role === "partner" ? "Tornar parceiro" : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
