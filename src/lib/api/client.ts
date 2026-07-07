import createClient from "openapi-fetch"
import type { paths } from "./schema"
import { env } from "@/lib/env"

export const apiClient = createClient<paths>({
  baseUrl: env.API_BASE_URL,
  credentials: "include",
})
