import { useState } from "react"
import { NavLink, Outlet, Link, useLocation } from "react-router-dom"
import { Menu, LogOut, ChevronDown } from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession } from "@/features/session/use-session"
import { useLogout } from "@/features/auth/api"
import { getInitials } from "@/lib/initials"
import { cn } from "@/lib/utils"

// `badge`: contador ao lado do rótulo (ex.: contestações abertas no painel);
// 0 ou ausente não mostra nada.
export type NavItem = { to: string; label: string; badge?: number }
// Grupo vira dropdown no desktop e seção com título no drawer mobile.
export type NavGroup = { label: string; items: NavItem[] }
export type NavEntry = NavItem | NavGroup

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry
}

function NavLabel({ item }: { item: NavItem }) {
  return (
    <>
      {item.label}
      {item.badge ? (
        <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-xs font-medium leading-none text-destructive-foreground">
          {item.badge}
        </span>
      ) : null}
    </>
  )
}

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    "text-sm font-medium transition-colors hover:text-foreground",
    isActive ? "text-foreground" : "text-muted-foreground",
  )
}

// Header compartilhado das áreas autenticadas do app — mobile-first:
// nav vira drawer lateral (Sheet) abaixo de md, inline acima disso.
// navItems é definido por cada layout que usa esse shell (painel admin, app autenticado, etc).
export function NavShell({ navItems }: { navItems: NavEntry[] }) {
  const { user } = useSession()
  const { pathname } = useLocation()
  const logoutMutation = useLogout()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Brand />
            <nav className="hidden items-center gap-4 md:flex">
              {navItems.map((entry) =>
                isNavGroup(entry) ? (
                  <DropdownMenu key={entry.label}>
                    <DropdownMenuTrigger
                      className={cn(
                        navLinkClassName({
                          isActive: entry.items.some((item) => pathname.startsWith(item.to)),
                        }),
                        "flex items-center gap-1 outline-none",
                      )}
                    >
                      {entry.label}
                      {/* O número fica no item, dentro do menu; no grupo fechado, só o aviso de que há algo. */}
                      {entry.items.some((item) => item.badge) && (
                        <span aria-hidden className="h-2 w-2 rounded-full bg-destructive" />
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {entry.items.map((item) => (
                        <DropdownMenuItem key={item.to} asChild>
                          <Link to={item.to}>
                            <NavLabel item={item} />
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <NavLink key={entry.to} to={entry.to} className={navLinkClassName}>
                    <NavLabel item={entry} />
                  </NavLink>
                ),
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    {/* Só o círculo de iniciais: o nome já abre logo abaixo, no
                        DropdownMenuLabel, e repeti-lo no botão gastava espaço do
                        header sem informar nada de novo. O `aria-label` carrega
                        o nome porque, sem o texto visível, as iniciais sozinhas
                        não dizem de quem é a conta para um leitor de tela. */}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Conta de ${user.name}`}
                      className="h-9 w-9 rounded-full bg-muted text-xs font-medium"
                    >
                      {getInitials(user.name)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/perfil">Meu perfil</Link>
                    </DropdownMenuItem>
                    {/* Assinatura é assunto de conta, não de conteúdo — fica ao
                        lado de "Meu perfil" em vez de disputar a nav principal
                        com Quiz/Histórico/Desempenho. Vale para os três layouts
                        (app, painel e parceiro): quem administra ou publica
                        também tem uma assinatura própria. */}
                    <DropdownMenuItem asChild>
                      <Link to="/assinatura">Assinatura</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/inicio">Início</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}>
                      {logoutMutation.isPending ? "Saindo…" : "Sair"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Abrir menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex w-3/4 flex-col">
          <SheetHeader>
            <SheetTitle>
              <Brand />
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 pt-2">
            {navItems.map((entry) =>
              isNavGroup(entry) ? (
                <div key={entry.label} className="flex flex-col gap-1 pt-2">
                  <span className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {entry.label}
                  </span>
                  {entry.items.map((item) => (
                    <MobileNavLink key={item.to} item={item} onNavigate={() => setMobileNavOpen(false)} />
                  ))}
                </div>
              ) : (
                <MobileNavLink key={entry.to} item={entry} onNavigate={() => setMobileNavOpen(false)} />
              ),
            )}
          </nav>

          {user && (
            <div className="mt-auto space-y-1 border-t pt-4">
              <div className="flex items-center gap-2 px-3 py-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {getInitials(user.name)}
                </span>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <Link
                to="/perfil"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Meu perfil
              </Link>
              <Link
                to="/assinatura"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Assinatura
              </Link>
              <Link
                to="/inicio"
                onClick={() => setMobileNavOpen(false)}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                Início
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false)
                  logoutMutation.mutate()
                }}
                disabled={logoutMutation.isPending}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                {logoutMutation.isPending ? "Saindo…" : "Sair"}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <main>
        <Outlet />
      </main>
    </div>
  )
}

function MobileNavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
          isActive ? "bg-muted text-foreground" : "text-muted-foreground",
        )
      }
    >
      <NavLabel item={item} />
    </NavLink>
  )
}
