import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { useChangeUserRole } from "@/features/users/users-admin-api"
import { ApiError } from "@/lib/api/errors"

export const ROLE_LABELS = {
  client: "Cliente",
  partner: "Parceiro",
  admin: "Admin",
} as const

export const STATUS_LABELS = {
  active: "Ativa",
  inactive: "Inativa",
  deleted: "Excluída",
} as const

export type RoleAction = { user: { id: string; name: string }; role: "partner" | "client" }

export interface ChangeRoleDialogProps {
  action: RoleAction | null
  onClose: () => void
}

// PROF-RF-012/013 — confirmação de promover a parceiro ou revogar o papel,
// usada pela listagem e pelo detalhe de usuário.
export function ChangeRoleDialog({ action, onClose }: ChangeRoleDialogProps) {
  const [reason, setReason] = useState("")
  const changeRoleMutation = useChangeUserRole()

  useEffect(() => {
    if (action) setReason("")
  }, [action])

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
      onClose()
    }
  }

  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onClose()}>
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
  )
}
