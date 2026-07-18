#!/usr/bin/env node
// Driver Playwright para bomberquiz-web. chromium-cli não está disponível
// neste container (`chromium-cli not found`), então este driver fala
// diretamente com `playwright` (instalado só aqui, em
// .claude/skills/run-bomberquiz-web/package.json — não é dependência do
// projeto real, que conscientemente ainda não tem Playwright/E2E).
//
// Uso: node .claude/skills/run-bomberquiz-web/driver.mjs [path]
//   path (opcional) — rota a visitar após login, default "/inicio".
//
// Env vars:
//   BOMBERQUIZ_WEB_URL      default http://localhost:5173
//   BOMBERQUIZ_LOGIN_EMAIL  default delivered@resend.dev
//   BOMBERQUIZ_LOGIN_PASSWORD default Senha-Forte-9x8y7z
//
// Requer um usuário já cadastrado (e-mail verificado) com essas credenciais
// no banco de dev — rode primeiro o smoke.sh do bomberquiz-api (skill
// run-bomberquiz-api) para ter um admin de teste, ou ajuste as env vars para
// um usuário que você já criou manualmente.

import { chromium } from "playwright"
import { mkdirSync } from "node:fs"

const BASE_URL = process.env.BOMBERQUIZ_WEB_URL ?? "http://localhost:5173"
const EMAIL = process.env.BOMBERQUIZ_LOGIN_EMAIL ?? "delivered@resend.dev"
const PASSWORD = process.env.BOMBERQUIZ_LOGIN_PASSWORD ?? "Senha-Forte-9x8y7z"
const TARGET_PATH = process.argv[2] ?? "/inicio"

const SCREENSHOT_DIR = "/tmp/bomberquiz-web-screenshots"
mkdirSync(SCREENSHOT_DIR, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newContext().then((ctx) => ctx.newPage())

const consoleErrors = []
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text())
})

try {
  console.log(`[driver] login como ${EMAIL} em ${BASE_URL}`)
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel("E-mail").fill(EMAIL)
  await page.getByLabel("Senha").fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL(/\/(inicio|consentimento)/, { timeout: 10000 })
  console.log("[driver] login OK, em", page.url())

  if (TARGET_PATH !== "/inicio" && !page.url().includes("consentimento")) {
    console.log(`[driver] navegando para ${TARGET_PATH}`)
    await page.goto(`${BASE_URL}${TARGET_PATH}`)
    await page.waitForLoadState("networkidle")
  }

  const shotPath = `${SCREENSHOT_DIR}/${TARGET_PATH.replace(/\//g, "_") || "root"}.png`
  await page.screenshot({ path: shotPath, fullPage: true })
  console.log(`[driver] screenshot: ${shotPath}`)

  if (consoleErrors.length) {
    console.log("[driver] console errors:")
    console.log(consoleErrors.join("\n"))
  } else {
    console.log("[driver] nenhum erro de console")
  }
} finally {
  await browser.close()
}
