import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  useAdminUsers,
  type UserRoleFilter,
  type UserStatusFilter,
} from "@/features/users/users-admin-api"
import { ChangeRoleDialog, ROLE_LABELS, STATUS_LABELS, type RoleAction } from "./change-role-dialog"

const PAGE_SIZE = 20

const SELECT_CLASS =
  "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—"
}

// PROF-RF-011 a 013 — admin localiza usuários e promove cliente a parceiro ou
// revoga o papel. Admin não aparece com ação: entra e sai só pela whitelist.
export function UsersPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRoleFilter>("all")
  const [status, setStatus] = useState<UserStatusFilter>("all")
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<RoleAction | null>(null)

  const { data, isPending, isError } = useAdminUsers({
    email: email.trim() || undefined,
    name: name.trim() || undefined,
    role,
    status,
    page,
    pageSize: PAGE_SIZE,
  })

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
                  <TableCell className="font-medium">
                    <Link to={`/painel/usuarios/${user.id}`} className="hover:underline">
                      {user.name}
                    </Link>
                  </TableCell>
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
                      <Button size="sm" variant="outline" onClick={() => setAction({ user, role: "partner" })}>
                        Tornar parceiro
                      </Button>
                    )}
                    {user.role === "partner" && (
                      <Button size="sm" variant="outline" onClick={() => setAction({ user, role: "client" })}>
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

      <ChangeRoleDialog action={action} onClose={() => setAction(null)} />
    </div>
  )
}
