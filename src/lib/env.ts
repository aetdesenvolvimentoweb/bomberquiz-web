const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

// String vazia é um valor válido e intencional: usa caminhos relativos, resolvidos pelo
// proxy do Vite dev server contra a API local (ver vite.config.ts § server.proxy). Só a
// ausência total da variável é erro de configuração.
if (apiBaseUrl === undefined) {
  throw new Error("VITE_API_BASE_URL não configurada. Veja .env.example.")
}

export const env = {
  API_BASE_URL: apiBaseUrl,
}
