import { cn } from "@/lib/utils"

/**
 * Catálogo das poses do mascote, com as dimensões **do arquivo** em
 * `public/images/`. `width`/`height` vão para o `<img>` só para o navegador
 * reservar a proporção antes do download (sem o conteúdo pular); o tamanho na
 * tela é decidido por quem usa, via `className`.
 *
 * Os originais em alta resolução ficam em `web/assets-src/mascote/`, fora do
 * build. Os de `public/` são versões reduzidas: 400px de largura para as telas
 * (nítidos até ~200px em retina) e 240px para os passos da vitrine (~120px).
 */
const POSES = {
  welcome: { src: "/images/bq_welcome.webp", width: 433, height: 699 },
  happy: { src: "/images/bq_happy.webp", width: 400, height: 646 },
  encouraging: { src: "/images/bq_encouraging.webp", width: 400, height: 646 },
  looking: { src: "/images/bq_looking.webp", width: 400, height: 646 },
  empty: { src: "/images/bq_empty.webp", width: 400, height: 646 },
  email: { src: "/images/bq_email.webp", width: 400, height: 646 },
  lost: { src: "/images/bq_404.webp", width: 400, height: 646 },
  choice: { src: "/images/bq_choice.webp", width: 240, height: 387 },
  focus: { src: "/images/bq_face.webp", width: 240, height: 387 },
  evolution: { src: "/images/bq_evolution.webp", width: 240, height: 387 },
} as const

export type MascotPose = keyof typeof POSES

/**
 * `alt` é obrigatório de propósito: cada uso diz o que o mascote está fazendo
 * ali. Quando a imagem só decora um texto que já diz tudo, passe `alt=""` — o
 * leitor de tela pula a imagem em vez de ler uma descrição redundante.
 *
 * `priority` só para a imagem principal acima da dobra (o herói da vitrine);
 * o resto carrega preguiçosamente, para ninguém baixar mascote que não vê.
 */
export function Mascot({
  pose,
  alt,
  className,
  priority = false,
}: {
  pose: MascotPose
  alt: string
  className?: string
  priority?: boolean
}) {
  const { src, width, height } = POSES[pose]
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn("h-auto shrink-0 select-none", className)}
      draggable={false}
    />
  )
}
