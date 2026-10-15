import { useState } from "react"
import { getInitials } from "@/lib/initials"
import { cn } from "@/lib/utils"

/**
 * Pede ao Cloudinary a foto já no tamanho de exibição (dobro, para telas de
 * alta densidade) e no formato que o navegador aceita melhor (ADR-0013). URL
 * de fora do Cloudinary passa intacta.
 */
export function avatarSrc(url: string, displayPx: number): string {
  const size = displayPx * 2
  return url.replace("/image/upload/", `/image/upload/c_fill,w_${size},h_${size},f_auto,q_auto/`)
}

type UserAvatarProps = {
  name: string
  avatarUrl: string | null | undefined
  /** Tamanho exibido em px — só escolhe a variante pedida ao Cloudinary. */
  size: number
  className?: string
}

/**
 * Foto do usuário (PROF-RF-005) ou, sem foto, as iniciais (AUTH-RF-001 CA-3).
 * Se a imagem falhar ao carregar, também volta às iniciais. O tamanho visual
 * e a cor vêm do `className` de quem usa.
 */
export function UserAvatar({ name, avatarUrl, size, className }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = !!avatarUrl && failedUrl !== avatarUrl

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium",
        className,
      )}
    >
      {showImage && avatarUrl ? (
        <img
          src={avatarSrc(avatarUrl, size)}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  )
}
