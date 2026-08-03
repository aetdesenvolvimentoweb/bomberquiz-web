import { describe, expect, it, vi, beforeEach } from "vitest"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { InstallBanner } from "@/features/pwa/install-banner"

const DISMISS_KEY = "bomberquiz:install-prompt-dismissed"

type BeforeInstallPromptEventMock = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true })
}

function dispatchBeforeInstallPrompt(): BeforeInstallPromptEventMock {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as BeforeInstallPromptEventMock
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome: "accepted" })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

const chromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
const iosUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"

beforeEach(() => {
  localStorage.clear()
  mockMatchMedia(false)
  setUserAgent(chromeUserAgent)
})

describe("InstallBanner", () => {
  it("não renderiza nada antes do evento beforeinstallprompt (Android/Chrome)", () => {
    render(<InstallBanner />)

    expect(screen.queryByText("Instale o BomberQuiz")).not.toBeInTheDocument()
  })

  it("mostra o CTA de instalar no Android/Chrome após beforeinstallprompt e aciona o prompt nativo", async () => {
    render(<InstallBanner />)
    const event = dispatchBeforeInstallPrompt()

    expect(await screen.findByText("Instale o BomberQuiz")).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: "Instalar" }))

    expect(event.prompt).toHaveBeenCalled()
  })

  it("mostra instruções manuais no iOS Safari, sem CTA de instalar", () => {
    setUserAgent(iosUserAgent)

    render(<InstallBanner />)

    expect(screen.getByText("Instale o BomberQuiz")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Instalar" })).not.toBeInTheDocument()
  })

  it("não renderiza quando o app já está em modo standalone", () => {
    mockMatchMedia(true)
    setUserAgent(iosUserAgent)

    render(<InstallBanner />)

    expect(screen.queryByText("Instale o BomberQuiz")).not.toBeInTheDocument()
  })

  it("some ao clicar em 'Agora não' e permanece oculto após remontar (cooldown)", async () => {
    setUserAgent(iosUserAgent)

    const { unmount } = render(<InstallBanner />)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Agora não" }))

    expect(screen.queryByText("Instale o BomberQuiz")).not.toBeInTheDocument()
    expect(localStorage.getItem(DISMISS_KEY)).not.toBeNull()

    unmount()
    render(<InstallBanner />)

    expect(screen.queryByText("Instale o BomberQuiz")).not.toBeInTheDocument()
  })
})
