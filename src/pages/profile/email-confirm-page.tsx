import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useConfirmEmailChange } from "@/features/profile/api"
import { SESSION_QUERY_KEY } from "@/features/session/use-session"

type Status = "checking" | "success" | "error"

export function EmailConfirmPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<Status>("checking")
  const confirmEmailChangeMutation = useConfirmEmailChange()
  const queryClient = useQueryClient()
  const ranOnce = useRef(false)

  useEffect(() => {
    if (ranOnce.current) return
    ranOnce.current = true

    if (!token) {
      setStatus("error")
      return
    }

    confirmEmailChangeMutation
      .mutateAsync(token)
      .then(() => {
        setStatus("success")
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
      })
      .catch(() => setStatus("error"))
  }, [token])

  return (
    <AuthLayout title="Confirmação de troca de e-mail">
      {status === "checking" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Confirmando…
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Seu e-mail foi atualizado com sucesso.</p>
          <Button asChild className="w-full">
            <Link to="/perfil">Ir para o perfil</Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link inválido ou expirado. Se você ainda tem acesso à conta, solicite a troca novamente no perfil.
          </p>
          <Button asChild className="w-full">
            <Link to="/perfil">Ir para o perfil</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
