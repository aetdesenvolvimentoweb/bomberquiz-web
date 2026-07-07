import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useDeactivateAccount, useDeleteAccount } from "@/features/profile/api"
import { reauthActionSchema, deleteAccountSchema, type ReauthActionFormValues, type DeleteAccountFormValues } from "@/features/profile/schemas"
import { ApiError } from "@/lib/api/errors"

function DeactivateAccountDialog() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const deactivateMutation = useDeactivateAccount()

  const form = useForm<ReauthActionFormValues>({
    resolver: zodResolver(reauthActionSchema),
    defaultValues: { password: "" },
  })

  async function onSubmit(values: ReauthActionFormValues) {
    try {
      await deactivateMutation.mutateAsync(values.password)
      toast.success("Conta desativada.")
      setOpen(false)
      navigate("/login", { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível desativar a conta."
      toast.error(message)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline">Desativar conta</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar conta</AlertDialogTitle>
          <AlertDialogDescription>
            Seu acesso fica pausado e seus dados são preservados. Você pode reativar fazendo login novamente.
            Confirme sua senha para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={deactivateMutation.isPending}>
                {deactivateMutation.isPending ? "Desativando…" : "Confirmar"}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const deleteAccountMutation = useDeleteAccount()

  const form = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "", confirmIrreversible: undefined },
  })

  async function onSubmit(values: DeleteAccountFormValues) {
    try {
      await deleteAccountMutation.mutateAsync(values.password)
      toast.success("Conta excluída. Seus dados foram anonimizados conforme a LGPD.")
      setOpen(false)
      navigate("/login", { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível excluir a conta."
      toast.error(message)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Excluir conta</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é <strong>irreversível</strong>. Seus dados pessoais serão anonimizados conforme a LGPD.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmIrreversible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-normal">
                      Entendo que esta ação é irreversível e anonimizará meus dados
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <Button type="submit" variant="destructive" disabled={deleteAccountMutation.isPending}>
                {deleteAccountMutation.isPending ? "Excluindo…" : "Excluir definitivamente"}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function DangerZoneSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sair do BomberQuiz</CardTitle>
        <CardDescription>Desativar pausa o acesso de forma reversível. Excluir é definitivo.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <DeactivateAccountDialog />
        <DeleteAccountDialog />
      </CardContent>
    </Card>
  )
}
