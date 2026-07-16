import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/phone-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useUpdateProfile } from "@/features/profile/api"
import { updateProfileSchema, type UpdateProfileFormValues } from "@/features/profile/schemas"
import type { SessionUser } from "@/features/session/use-session"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

export function PersonalInfoSection({ user }: { user: SessionUser }) {
  const updateProfileMutation = useUpdateProfile()

  const form = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name,
      phone: user.phone,
      dob: user.dob,
      sex: user.sex,
    },
  })

  async function onSubmit(values: UpdateProfileFormValues) {
    try {
      await updateProfileMutation.mutateAsync(values)
      toast.success("Perfil atualizado.")
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível atualizar o perfil."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados pessoais</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="prefere_nao_informar">Prefere não informar</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" loading={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
