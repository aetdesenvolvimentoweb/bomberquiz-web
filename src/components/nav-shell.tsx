import { useState } from "react"
import { NavLink, Outlet, Link } from "react-router-dom"
import { Menu, LogOut } from "lucide-react"
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

export type NavItem = { to: string; label: string }

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return cn(
    "text-sm font-medium transition-colors hover:text-foreground",
    isActive ? "text-foreground" : "text-muted-foreground",
  )
}

// Header compartilhado das áreas autenticadas do app — mobile-first:
// nav vira drawer lateral (Sheet) abaixo de md, inline acima disso.
// navItems é definido por cada layout que usa esse shell (painel admin, app autenticado, etc).
export function NavShell({ navItems }: { navItems: NavItem[] }) {
  const { user } = useSession()
  const logoutMutation = useLogout()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Brand />
            <nav className="hidden items-center gap-4 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClassName}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {getInitials(user.name)}
                      </span>
                      {user.name.split(" ")[0]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/perfil">Meu perfil</Link>
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
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
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
