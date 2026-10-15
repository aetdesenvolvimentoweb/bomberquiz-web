export type PixelCrop = { x: number; y: number; width: number; height: number }

export const AVATAR_OUTPUT_PX = 512

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Não foi possível abrir a imagem"))
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Recorta o quadrado escolhido e reduz para 512×512 (PROF-RF-005). Foto de
 * celular chega com vários MB; o que sobe para a API fica com dezenas de KB,
 * longe do limite de 2 MB.
 *
 * WebP primeiro; navegador que não gera WebP devolve PNG no `toBlob`, e aí
 * usamos JPEG, bem menor que PNG para foto.
 */
export async function cropToAvatarBlob(src: string, crop: PixelCrop): Promise<Blob> {
  const image = await loadImage(src)
  const canvas = document.createElement("canvas")
  canvas.width = AVATAR_OUTPUT_PX
  canvas.height = AVATAR_OUTPUT_PX
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Não foi possível processar a imagem")

  context.imageSmoothingQuality = "high"
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, AVATAR_OUTPUT_PX, AVATAR_OUTPUT_PX)

  const webp = await canvasToBlob(canvas, "image/webp", 0.85)
  if (webp && webp.type === "image/webp") return webp
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.85)
  if (!jpeg) throw new Error("Não foi possível processar a imagem")
  return jpeg
}
