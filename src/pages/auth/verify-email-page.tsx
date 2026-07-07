import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { env } from "@/lib/env"
import { useQueryClient } from "@tanstack/react-query"
import { SESSION_QUERY_KEY } from "@/features/session/use-session"

type Status = "checking" | "success" | "error"

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<Status>("checking")
  const queryClient = useQueryClient()
  const ranOnce = useRef(false)

  useEffect(() => {
    if (ranOnce.current) return
    ranOnce.current = true

    if (!token) {
      setStatus("error")
      return
    }

    // Verificação de e-mail é feita pela rota nativa do Better-Auth, não por um endpoint próprio
    // (ver infra/auth/better-auth.ts — o link enviado por e-mail aponta para esta página com ?token=).
    fetch(`${env.API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then((res) => {
        setStatus(res.ok ? "success" : "error")
        // autoSignInAfterVerification pode ter criado sessão — atualiza o cache.
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
      })
      .catch(() => setStatus("error"))
  }, [token, queryClient])

  return (
    <AuthLayout title="Verificação de e-mail">
      {status === "checking" && <p className="text-sm text-muted-foreground">Confirmando seu e-mail…</p>}

      {status === "success" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Seu e-mail foi verificado com sucesso.</p>
          <Button asChild className="w-full">
            <Link to="/inicio">Continuar</Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link inválido ou expirado. Solicite um novo link de verificação.
          </p>
          <Button asChild className="w-full">
            <Link to="/reenviar-verificacao">Reenviar e-mail de verificação</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
