import { createBrowserRouter, Outlet } from "react-router-dom"
import { RequireAuth, RequireGuest, ConsentGate } from "@/features/session/guards"
import { RouteErrorBoundary } from "@/components/route-error-boundary"
import { RegisterPage } from "@/pages/auth/register-page"
import { LoginPage } from "@/pages/auth/login-page"
import { VerifyEmailPage } from "@/pages/auth/verify-email-page"
import { ResendVerificationPage } from "@/pages/auth/resend-verification-page"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password-page"
import { ResetPasswordPage } from "@/pages/auth/reset-password-page"
import { ProfilePage } from "@/pages/profile/profile-page"
import { EmailConfirmPage } from "@/pages/profile/email-confirm-page"
import { ConsentRenewalPage } from "@/pages/profile/consent-renewal-page"
import { TermsPage } from "@/pages/legal/terms-page"
import { PrivacyPage } from "@/pages/legal/privacy-page"
import { HomePage } from "@/pages/home-page"
import { IndexRedirectPage } from "@/pages/index-redirect-page"

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // Públicas
      { path: "/termos", element: <TermsPage /> },
      { path: "/privacidade", element: <PrivacyPage /> },
      { path: "/verificar-email", element: <VerifyEmailPage /> },
      { path: "/reenviar-verificacao", element: <ResendVerificationPage /> },
      { path: "/redefinir-senha", element: <ResetPasswordPage /> },

      // Apenas visitante (sem sessão)
      {
        element: <RequireGuest />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/cadastro", element: <RegisterPage /> },
          { path: "/esqueci-senha", element: <ForgotPasswordPage /> },
        ],
      },

      // Autenticadas
      {
        element: <RequireAuth />,
        children: [
          { path: "/consentimento", element: <ConsentRenewalPage /> },
          {
            element: <ConsentGate />,
            children: [
              { path: "/inicio", element: <HomePage /> },
              { path: "/perfil", element: <ProfilePage /> },
              { path: "/perfil/email/confirmar", element: <EmailConfirmPage /> },
            ],
          },
        ],
      },

      { path: "/", element: <IndexRedirectPage /> },
    ],
  },
])
