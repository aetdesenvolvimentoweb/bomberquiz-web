import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { useEffect } from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"
import { AvatarEditor } from "@/pages/profile/avatar-editor"
import { avatarSrc, UserAvatar } from "@/components/user-avatar"
import { SESSION_QUERY_KEY, type SessionUser } from "@/features/session/use-session"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// O recorte de verdade precisa de canvas e de imagem carregada — nenhum dos
// dois existe no jsdom. O Cropper falso já entrega a área escolhida.
vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete }: { onCropComplete: (a: unknown, b: unknown) => void }) => {
    useEffect(() => {
      onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 800, height: 800 })
    }, [onCropComplete])
    return <div data-testid="cropper" />
  },
}))

vi.mock("@/lib/crop-image", () => ({
  cropToAvatarBlob: vi.fn(async () => new Blob(["webp"], { type: "image/webp" })),
}))

const CLOUDINARY_URL = "https://res.cloudinary.com/demo/image/upload/v1/bomberquiz/users/a.webp"

function buildUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u-1",
    name: "Maria Bombeira",
    email: "maria@example.com",
    phone: "62999998888",
    dob: "1990-01-01",
    sex: "feminino",
    avatarUrl: null,
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    role: "client",
    status: "active",
    consentVersion: 1,
    trialUsedAt: null,
    lastLoginAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function renderEditor(user: SessionUser) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(SESSION_QUERY_KEY, { user, requiresConsentRenewal: false })
  render(
    <QueryClientProvider client={queryClient}>
      <AvatarEditor user={user} />
    </QueryClientProvider>,
  )
  return queryClient
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
  URL.createObjectURL = vi.fn(() => "blob:foto")
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("AvatarEditor (PROF-RF-005)", () => {
  it("escolher foto → ajustar → salvar envia o recorte e troca a foto na sessão", async () => {
    // Arrange
    const updated = buildUser({ avatarUrl: CLOUDINARY_URL })
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ user: updated }), { status: 200 }))
    const queryClient = renderEditor(buildUser())
    const file = new File(["foto"], "foto.jpg", { type: "image/jpeg" })

    // Act
    await userEvent.setup().upload(screen.getByLabelText("Escolher foto"), file)
    const dialog = await screen.findByRole("dialog")
    await userEvent.setup().click(within(dialog).getByRole("button", { name: "Salvar foto" }))

    // Assert
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toMatch(/\/me\/avatar$/)
    expect(init.method).toBe("POST")
    expect((init.body as FormData).get("file")).toBeInstanceOf(Blob)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Foto atualizada."))
    const session = queryClient.getQueryData<{ user: SessionUser }>(SESSION_QUERY_KEY)
    expect(session?.user.avatarUrl).toBe(CLOUDINARY_URL)
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("recusa formato que não é JPEG/PNG/WEBP sem abrir o recorte", () => {
    // Arrange
    renderEditor(buildUser())
    const file = new File(["gif"], "anim.gif", { type: "image/gif" })

    // Act — fireEvent: o upload do user-event já filtraria pelo accept.
    fireEvent.change(screen.getByLabelText("Escolher foto"), { target: { files: [file] } })

    // Assert
    expect(toast.error).toHaveBeenCalledWith("Use uma foto JPEG, PNG ou WEBP.")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("erro da API aparece no toast e o recorte continua aberto", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "image_upload_failed", message: "Não foi possível enviar a foto agora.", request_id: "r" } }),
        { status: 502 },
      ),
    )
    renderEditor(buildUser())

    // Act
    await userEvent.setup().upload(screen.getByLabelText("Escolher foto"), new File(["x"], "f.png", { type: "image/png" }))
    const dialog = await screen.findByRole("dialog")
    await userEvent.setup().click(within(dialog).getByRole("button", { name: "Salvar foto" }))

    // Assert
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível enviar a foto agora."))
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("com foto: mostra 'Trocar foto' e 'Remover', que chama DELETE /me/avatar", async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ user: buildUser() }), { status: 200 }))
    renderEditor(buildUser({ avatarUrl: CLOUDINARY_URL }))
    expect(screen.getByRole("button", { name: "Trocar foto" })).toBeInTheDocument()

    // Act
    await userEvent.setup().click(screen.getByRole("button", { name: "Remover" }))

    // Assert
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/me\/avatar$/), expect.objectContaining({ method: "DELETE" })))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Foto removida."))
  })

  it("sem foto: oferece 'Adicionar foto' e não mostra 'Remover'", () => {
    // Arrange & Act
    renderEditor(buildUser())

    // Assert
    expect(screen.getByRole("button", { name: "Adicionar foto" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remover" })).not.toBeInTheDocument()
  })
})

describe("UserAvatar", () => {
  it("sem foto mostra as iniciais", () => {
    // Arrange & Act
    const { container } = render(<UserAvatar name="Maria Bombeira" avatarUrl={null} size={36} />)

    // Assert
    expect(container).toHaveTextContent("MB")
    expect(container.querySelector("img")).toBeNull()
  })

  it("com foto pede ao Cloudinary o tamanho exibido e volta às iniciais se a imagem falhar", () => {
    // Arrange
    const { container } = render(<UserAvatar name="Maria Bombeira" avatarUrl={CLOUDINARY_URL} size={36} />)
    const img = container.querySelector("img")!

    // Assert — variante 72×72 (2×) com formato automático
    expect(img.getAttribute("src")).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_72,h_72,f_auto,q_auto/v1/bomberquiz/users/a.webp",
    )

    // Act
    fireEvent.error(img)

    // Assert
    expect(container.querySelector("img")).toBeNull()
    expect(container).toHaveTextContent("MB")
  })

  it("URL fora do Cloudinary passa intacta", () => {
    expect(avatarSrc("https://example.com/foto.png", 36)).toBe("https://example.com/foto.png")
  })
})
