import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAdminUsers } from "@/features/users/users-admin-api"
import { useGrantCourtesy, type CourtesyCategory } from "@/features/courtesies/courtesies-admin-api"
import { ApiError } from "@/lib/api/errors"
import { formatDateWithTime } from "@/lib/dates"

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const STATUS_LABELS = { active: "ativa", inactive: "inativa", deleted: "excluída" } as const

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
}

export interface GrantCourtesyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// SUB-RF-008 — o admin acha o beneficiário pelo e-mail exato (a mesma busca de
// /painel/usuarios) e confirma vendo nome e situação da conta antes de conceder.
export function GrantCourtesyDialog({ open, onOpenChange }: GrantCourtesyDialogProps) {
  const [email, setEmail] = useState("")
  const [days, setDays] = useState("30")
  const [category, setCategory] = useState<CourtesyCategory>("parceria")
  const [notes, setNotes] = useState("")
  const grantMutation = useGrantCourtesy()

  useEffect(() => {
    if (open) {
      setEmail("")
      setDays("30")
      setCategory("parceria")
      setNotes("")
    }
  }, [open])

  const trimmedEmail = email.trim()
  const lookupEnabled = open && trimmedEmail.includes("@")
  const lookup = useAdminUsers(
    { email: trimmedEmail, role: "all", status: "all", page: 1, pageSize: 1 },
    { enabled: lookupEnabled },
  )
  const beneficiary = lookupEnabled ? lookup.data?.items[0] : undefined

  const daysNumber = Number(days)
  const daysValid = Number.isInteger(daysNumber) && daysNumber >= 1 && daysNumber <= 365
  const canSubmit = beneficiary !== undefined && daysValid && !grantMutation.isPending

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!beneficiary || !daysValid) return
    try {
      const granted = await grantMutation.mutateAsync({
        beneficiary_user_id: beneficiary.id,
        days_granted: daysNumber,
        category,
        notes: notes.trim() || undefined,
      })
      toast.success(`Cortesia concedida a ${beneficiary.name}, válida até ${formatDateWithTime(granted.end_at)}.`)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === "courtesy_monthly_limit" && typeof err.details?.resets_at === "string") {
        toast.error(`Você já concedeu 10 cortesias este mês. O limite renova em ${formatDate(err.details.resets_at)}.`)
      } else {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível conceder a cortesia.")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder cortesia</DialogTitle>
          <DialogDescription>
            Os dias se somam ao que o usuário já tem de assinatura paga ou de cortesia.
          </DialogDescription>
        </DialogHeader>

        <form id="grant-courtesy-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courtesy-email">E-mail do usuário</Label>
            <Input
              id="courtesy-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {lookupEnabled && !lookup.isPending && (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {beneficiary
                  ? `${beneficiary.name} · conta ${STATUS_LABELS[beneficiary.status]}`
                  : "Nenhum usuário com este e-mail."}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="courtesy-days">Dias (1 a 365)</Label>
              <Input
                id="courtesy-days"
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courtesy-category">Categoria</Label>
              <select
                id="courtesy-category"
                className={SELECT_CLASS}
                value={category}
                onChange={(e) => setCategory(e.target.value as CourtesyCategory)}
              >
                <option value="parceria">Parceria</option>
                <option value="demonstracao">Demonstração</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courtesy-notes">Observações (opcional)</Label>
            <Textarea
              id="courtesy-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="grant-courtesy-form" disabled={!canSubmit}>
            Conceder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
