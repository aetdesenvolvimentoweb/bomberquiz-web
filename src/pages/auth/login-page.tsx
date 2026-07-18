import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/api";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { ApiError } from "@/lib/api/errors";
import { applyServerFieldErrors } from "@/lib/api/form-errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Link,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: { from?: Location } };
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginMutation.mutateAsync(values);
      const redirectTo = location.state?.from?.pathname ?? "/inicio";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (applyServerFieldErrors(form, err)) return;
      if (err instanceof ApiError && err.code === "email_not_verified") {
        toast.error(err.message, {
          action: {
            label: "Reenviar e-mail",
            onClick: () =>
              navigate(
                `/reenviar-verificacao?email=${encodeURIComponent(values.email)}`,
              ),
          },
        });
        return;
      }
      const message =
        err instanceof ApiError ? err.message : "Não foi possível entrar.";
      toast.error(message);
    }
  }

  return (
    <AuthLayout title="Entrar" description="Acesse sua conta">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="voce@exemplo.com"
                    {...field}
                  />
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

          <div className="text-right text-sm">
            <Link to="/esqueci-senha" className="underline">
              Esqueci minha senha
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            loading={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link to="/cadastro" className="underline">
          Criar conta
        </Link>
      </p>
    </AuthLayout>
  );
}
