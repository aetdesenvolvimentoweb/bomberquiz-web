---
name: run-bomberquiz-web
description: Build, run, and drive bomberquiz-web (Vite + React PWA) in a headless Chromium via Playwright. Use when asked to start the frontend, log in as a test user, navigate to a screen, take a screenshot, or verify a UI change actually renders (not just typecheck/vitest passing).
---

`bomberquiz-web` is a Vite + React SPA with no native GUI — it's driven by
launching the Vite dev server and controlling a headless Chromium via
`playwright` (`chromium-cli` is not available in this container). The
primary agent path is `.claude/skills/run-bomberquiz-web/driver.mjs`: it
logs in, navigates to a given route, and screenshots the result.

This app **requires `bomberquiz-api` running** (same-origin via the Vite
proxy, see Gotchas) and at least one confirmed user in its dev DB. Use the
sibling skill `run-bomberquiz-api` (in the `api/` repo) first — its
`smoke.sh` creates a promoted admin test user — or register one manually
(see Setup below).

All paths below are relative to the `web/` repo root.

## Prerequisites

Bun and Node must be installed (the driver runs under `node`, not `bun` —
`playwright`'s browser automation is the reliable path here). Playwright's
Chromium browser must be downloaded once. Cache location is
platform-dependent — `~/.cache/ms-playwright` on Linux/macOS, but on
**Windows** it's `%LOCALAPPDATA%\ms-playwright`
(`C:\Users\<user>\AppData\Local\ms-playwright`; confirmed already cached
there in this environment). Check before re-downloading:

```bash
ls "$LOCALAPPDATA/ms-playwright" 2>/dev/null || npx --yes playwright install chromium
```

This app also **requires `bomberquiz-api` running**, which itself needs
Docker Desktop up — see the `run-bomberquiz-api` skill's Prerequisites for
the Windows Docker Desktop startup steps if `docker ps` fails.

## Setup

```bash
bun install
```

The driver needs its own `playwright` package — deliberately **not** added
to the project's real `package.json` (this project consciously has no
Playwright/E2E setup yet, see `espec/docs/tarefas.md`). It lives isolated
inside the skill directory:

```bash
cd .claude/skills/run-bomberquiz-web && bun install && cd -
```

A confirmed test user must exist in the dev DB the API points at. Fastest
path — run the API's smoke test first (from the `api/` repo):

```bash
cd ../api && bash .claude/skills/run-bomberquiz-api/smoke.sh
```

That creates `delivered+admin<timestamp>@resend.dev` — pass it via
`BOMBERQUIZ_LOGIN_EMAIL` (see below), or register a fixed one manually:

```bash
curl -s -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Admin Smoke","email":"delivered@resend.dev","phone":"62999998888","dob":"1990-01-01","sex":"prefere_nao_informar","password":"Senha-Forte-9x8y7z","consent_version":1}'
docker exec api-postgres-dev-1 psql -U bomberquiz -d bomberquiz_dev -c \
  "UPDATE users SET email_verified = true, email_verified_at = now(), role = 'admin' WHERE email = 'delivered@resend.dev';"
```

`delivered@resend.dev` is Resend's sandbox test address — it always
"delivers" without a verified domain, so registration doesn't fail
sending the verification email (which is not fire-and-forget here).

## Build

No separate build step for local driving — Vite serves TS/TSX directly in dev mode.

## Run (agent path)

Start the dev server in the background:

```bash
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill 2>/dev/null   # free the port first, Linux/macOS
# Windows (no lsof in Git Bash):
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -EA SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

bun run dev > /tmp/bomberquiz-web-dev.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null; do sleep 1; done'
```

Then drive it:

```bash
node .claude/skills/run-bomberquiz-web/driver.mjs /painel/eixos
```

**On Windows/Git Bash, prefix with `MSYS_NO_PATHCONV=1`** — confirmed that
without it, Git Bash's MSYS path-conversion rewrites the leading-slash
route argument into a Windows path before Node ever sees it (`/painel/eixos`
became `C:/Program Files/Git/painel/eixos`, and Playwright then threw
`Cannot navigate to invalid URL`):

```bash
MSYS_NO_PATHCONV=1 node .claude/skills/run-bomberquiz-web/driver.mjs /painel/eixos
```

Logs in (`BOMBERQUIZ_LOGIN_EMAIL`/`_PASSWORD`, default
`delivered@resend.dev` / `Senha-Forte-9x8y7z`), navigates to the path
given as the first CLI arg (default `/inicio`), screenshots, and prints
any browser console errors. Screenshots land in
`/tmp/bomberquiz-web-screenshots/<path-with-underscores>.png` — **on
Windows this is not the Git Bash `/tmp`**, since the driver runs under the
native Windows `node`, which resolves a leading `/` to the current drive
root. Confirmed the file actually lands at
`C:\tmp\bomberquiz-web-screenshots\<name>.png` (viewable with the Read
tool at that path directly); `ls /tmp/...` from Git Bash won't find it.

| env var | default | notes |
|---|---|---|
| `BOMBERQUIZ_WEB_URL` | `http://localhost:5173` | |
| `BOMBERQUIZ_LOGIN_EMAIL` | `delivered@resend.dev` | must exist + be verified in the dev DB |
| `BOMBERQUIZ_LOGIN_PASSWORD` | `Senha-Forte-9x8y7z` | |

Stop the dev server afterward:

```bash
lsof -ti:5173 -sTCP:LISTEN | xargs -r kill   # Linux/macOS
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -EA SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"   # Windows
```

## Run (human path)

```bash
bun run dev   # → http://localhost:5173, Ctrl-C to stop. Blocks the terminal.
```

## Test

```bash
bun run typecheck   # tsc -b --noEmit — confirmed clean
bun run test        # vitest run — unit/RTL only, no E2E in this project yet — confirmed 40/40 passing, 10 files, ~17s
```

## Gotchas

- **Admin UI routes live under `/painel/*`, not `/admin/*`.** The Vite dev
  proxy (`vite.config.ts` § `server.proxy`) forwards *any* request starting
  with `/admin` — including full-page navigation, not just `fetch`/XHR — to
  the backend on port 3000. A React Router route at `/admin/eixos` 404s
  when navigated to directly (`page.goto`) because it hits the API's
  `/admin/*` REST namespace instead of the SPA. See ADR-0033 in
  `espec/docs/decisoes.md`. If you add a new admin screen, route it under
  `/painel/*`.
- **A `401 Unauthorized` console error after a successful login is
  expected**, not a bug: the session query (`GET /me`, via TanStack Query)
  can fire once before the login mutation's cookie is fully applied on
  first navigation. The driver's `waitForURL` still succeeds and the page
  renders correctly — confirmed by screenshot, not just the absence of a
  console error. Don't treat a lone 401 right after login as a regression;
  do treat 401s appearing later, mid-session, as real.
- **The default status filter on list screens (e.g. `/painel/eixos`) is
  "Ativos" (active only).** After archiving an item via the UI, it
  disappears from the table — that's correct behavior, not a broken
  mutation. Switch the status `<select>` to "Todos" to see archived items.
- **`chromium-cli` is not installed in this container** (`chromium-cli not
  found`) — that's why this skill has its own `driver.mjs` instead of the
  usual chromium-cli heredoc. If a future container has `chromium-cli`,
  either continues to work.
- **On Windows/Git Bash, any leading-slash CLI argument gets silently
  rewritten to a Windows path** before native (non-MSYS) executables like
  `node` see it — MSYS's automatic POSIX-to-Windows path conversion.
  `/painel/eixos` arrives as `C:/Program Files/Git/painel/eixos`, and
  Playwright fails with `Cannot navigate to invalid URL` — not an
  authentication or routing bug. Always run the driver with
  `MSYS_NO_PATHCONV=1` on Windows (baked into the command above).
- **Playwright's browser cache path differs by OS** — `~/.cache/ms-playwright`
  on Linux/macOS, `%LOCALAPPDATA%\ms-playwright` on Windows. Checking the
  wrong one looks like "not installed" and triggers a needless
  `playwright install chromium` re-download.

## Troubleshooting

- **Driver hangs / times out on `page.getByLabel("E-mail").fill(...)`**: the
  dev server likely isn't up yet, or is serving a stale build from a
  previous run on the same port. Kill port 5173 and restart (`lsof -ti:5173
  -sTCP:LISTEN | xargs -r kill`) before re-running the driver.
- **`page.waitForURL` times out staying on `/login`**: the login API call
  failed — usually because `bomberquiz-api` isn't running, or the test user
  isn't `email_verified`. Check `/tmp/bomberquiz-api-dev.log` and confirm
  with `curl http://localhost:3000/health`.
