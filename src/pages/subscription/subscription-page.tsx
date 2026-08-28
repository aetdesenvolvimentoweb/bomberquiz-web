import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { formatCentsToBRL } from "@/features/subscription/schemas"
import { useMySubscription } from "@/features/subscription/subscription-api"

const SOURCE_LABELS: Record<string, string> = {
  trial: "Período de teste",
  paid: "Assinatura paga",
  courtesy: "Cortesia",
}

export function SubscriptionPage() {
  const { data, isPending } = useMySubscription()

  if (isPending || !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  const isActive = data.access_status === "active"

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Minha assinatura</h1>
        <p className="text-sm text-muted-foreground">Status do seu acesso ao quiz.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {data.current_subscription?.plan_name ?? "Sem plano ativo"}
            </CardTitle>
            <Badge variant={isActive ? "success" : "destructive"}>{isActive ? "Ativa" : "Inativa"}</Badge>
          </div>
          {data.source && <CardDescription>{SOURCE_LABELS[data.source] ?? data.source}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {data.current_subscription && (
            <p className="text-sm text-muted-foreground">
              Válida até {new Date(data.current_subscription.end_at).toLocaleDateString("pt-BR")} — restam{" "}
              {data.current_subscription.remaining_days}{" "}
              {data.current_subscription.remaining_days === 1 ? "dia" : "dias"}.
            </p>
          )}

          {!isActive && (
            <p className="text-sm text-muted-foreground">
              Seu acesso ao quiz está bloqueado. Assine um plano para continuar praticando.
            </p>
          )}

          {data.pending_payments.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">Pagamentos pendentes</p>
              {data.pending_payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {payment.plan_name} · {formatCentsToBRL(payment.amount)}
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/assinatura/pagamento/${payment.id}`}>Continuar pagamento</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button asChild>
              <Link to="/planos">{isActive ? "Renovar / trocar plano" : "Assinar agora"}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/assinatura/pagamentos">Ver histórico de pagamentos</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
