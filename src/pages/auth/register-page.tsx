import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PhoneInput } from "@/components/phone-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useRegister } from "@/features/auth/api"
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas"
import { ApiError } from "@/lib/api/errors"
import { applyServerFieldErrors } from "@/lib/api/form-errors"

export function RegisterPage() {
  const [submitted, setSubmitted] = useState(false)
  const registerMutation = useRegister()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      dob: "",
      sex: undefined,
      password: "",
      confirmPassword: "",
      consentAccepted: undefined,
    },
  })

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerMutation.mutateAsync(values)
      setSubmitted(true)
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return
      const message = err instanceof ApiError ? err.message : "Não foi possível criar a conta."
      toast.error(message)
    }
  }

  if (submitted) {
    return (
      <AuthLayout title="Verifique seu e-mail">
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para o e-mail informado. Clique nele para ativar sua conta.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/login">Ir para o login</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Criar conta" description="Cadastre-se para começar a estudar para o TAP do CBMGO">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome e sobrenome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="voce@exemplo.com" {...field} />
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
                    placeholder="(61) 99999-9999"
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
                    <option value="" disabled>
                      Selecione
                    </option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="prefere_nao_informar">Prefere não informar</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consentAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal">
                    Li e aceito os <Link to="/termos" className="underline">Termos de Uso</Link> e a{" "}
                    <Link to="/privacidade" className="underline">Política de Privacidade</Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" loading={registerMutation.isPending}>
            {registerMutation.isPending ? "Criando conta…" : "Criar conta"}
          </Button>
        </form>
      </Form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/login" className="underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
