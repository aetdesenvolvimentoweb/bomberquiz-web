import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"
import { fileURLToPath } from "node:url"

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "BomberQuiz",
        short_name: "BomberQuiz",
        description: "Quiz de preparação para o TAP do CBMGO",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
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
})
