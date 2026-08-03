import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import path from "node:path"
import { fileURLToPath } from "node:url"

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Workbox testa o RegExp de runtimeCaching contra a href inteira (não só o pathname). Para
// origem diferente da do app (ex: api.bomberquiz.com.br vs. o host do frontend no Cloudflare
// Pages), o match só é aceito se começar no índice 0 — por isso ancoramos com a origem da API
// quando ela está configurada (prod). Em dev, VITE_API_BASE_URL fica vazia de propósito (ver
// src/lib/env.ts, chamadas same-origin via o proxy abaixo) e o SW nem roda por padrão, então
// um regex sem âncora de origem é suficiente.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function apiRuntimeCachingRoutes(apiBaseUrl: string) {
  const apiOrigin = apiBaseUrl ? new URL(apiBaseUrl).origin : ""
  const apiUrlPattern = (pathSuffixRegex: string): RegExp =>
    apiOrigin ? new RegExp(`^${escapeRegExp(apiOrigin)}${pathSuffixRegex}`) : new RegExp(pathSuffixRegex)

  return [
    {
      // Conteúdo de referência (taxonomia): muda raramente, ok servir do cache
      // imediatamente enquanto revalida em segundo plano.
      urlPattern: apiUrlPattern("/(axes|subjects)$"),
      method: "GET" as const,
      handler: "StaleWhileRevalidate" as const,
      options: {
        cacheName: "api-content",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      // Dados pessoais idempotentes: prefere rede fresca, mas tolera rede
      // instável/offline curta caindo pro último valor em cache.
      urlPattern: apiUrlPattern("/me(/quizzes|/performance(/timeline)?)?$"),
      method: "GET" as const,
      handler: "NetworkFirst" as const,
      options: {
        cacheName: "api-user",
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: apiUrlPattern("/quizzes/[^/]+/result$"),
      method: "GET" as const,
      handler: "NetworkFirst" as const,
      options: {
        cacheName: "api-user",
        networkTimeoutSeconds: 4,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ]
}

export default defineConfig(({ mode }) => {
  const apiBaseUrl = loadEnv(mode, process.cwd(), "VITE_").VITE_API_BASE_URL ?? ""

  // Upload de sourcemap pro Sentry (ADR-0031) — não usa prefixo VITE_ de propósito:
  // token/org/project são segredos de build, não devem vazar pro bundle do cliente.
  // Ausentes (dev local, CI sem conta Sentry configurada) = plugin não entra, build
  // segue normal só sem upload.
  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
  const sentryOrg = process.env.SENTRY_ORG
  const sentryProject = process.env.SENTRY_PROJECT
  const sentryPlugin =
    sentryAuthToken && sentryOrg && sentryProject
      ? sentryVitePlugin({
          authToken: sentryAuthToken,
          org: sentryOrg,
          project: sentryProject,
          sourcemaps: { filesToDeleteAfterUpload: ["dist/**/*.map"] },
        })
      : undefined

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "icons/icon-192.svg",
          "icons/icon-512.svg",
          "icons/icon-192.png",
          "icons/icon-512.png",
          "icons/icon-512-maskable.png",
          "apple-touch-icon.png",
          "favicon.ico",
        ],
        manifest: {
          name: "BomberQuiz",
          short_name: "BomberQuiz",
          description: "Quiz de preparação para o TAP do CBMGO",
          lang: "pt-BR",
          theme_color: "#0f172a",
          background_color: "#0f172a",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/(admin|auth|webhooks|api)\//],
          // Admin, auth e webhooks ficam de fora de propósito: precisam sempre de dados
          // frescos (admin) ou nunca devem ser servidos do cache (auth/webhooks). Mutações
          // (POST/PATCH/DELETE) também não entram — cada entrada abaixo é method: "GET".
          runtimeCaching: apiRuntimeCachingRoutes(apiBaseUrl),
        },
      }),
      // Sourcemaps precisam existir (build.sourcemap abaixo) para o upload funcionar,
      // e o plugin já os remove do dist/ publicado depois de enviados — não expõe
      // fonte original em produção.
      sentryPlugin,
    ],
    build: {
      // Necessário para o Sentry conseguir desminificar stack traces de produção
      // (ADR-0031) — os .map somem do dist/ publicado via sentryVitePlugin acima.
      sourcemap: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      // Proxy same-origin evita o problema de cookie cross-origin em dev: o cookie de sessão
      // usa SameSite=Lax fora de produção (ver api/src/infra/auth/better-auth.ts), que não é
      // enviado em fetch/XHR cross-site (localhost:5173 → localhost:3000) fora de navegação
      // top-level. Com o proxy, o navegador só enxerga localhost:5173 e a sessão persiste
      // normalmente entre reloads. Ver VITE_API_BASE_URL em .env.example.
      proxy: {
        "/auth": { target: "http://localhost:3000", changeOrigin: true },
        "/me": { target: "http://localhost:3000", changeOrigin: true },
        "/admin": { target: "http://localhost:3000", changeOrigin: true },
        "/plans": { target: "http://localhost:3000", changeOrigin: true },
        "/quizzes": { target: "http://localhost:3000", changeOrigin: true },
        "/events": { target: "http://localhost:3000", changeOrigin: true },
        "/axes": { target: "http://localhost:3000", changeOrigin: true },
        "/subjects": { target: "http://localhost:3000", changeOrigin: true },
        "/webhooks": { target: "http://localhost:3000", changeOrigin: true },
        "/api": { target: "http://localhost:3000", changeOrigin: true },
        "/health": { target: "http://localhost:3000", changeOrigin: true },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      env: {
        VITE_API_BASE_URL: "http://localhost:3000",
      },
    },
  }
})
