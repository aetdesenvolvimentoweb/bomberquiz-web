import { useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ApiError } from "@/lib/api/errors"

// Espelha a regra do backend (CONT-RF-013 CA-1) — checagem client-side é só UX,
// o backend revalida tipo real (magic bytes) e tamanho de qualquer forma.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export interface ImageUploadFieldProps {
  imageUrl: string | null
  isUploading: boolean
  isDeleting: boolean
  onUpload: (file: File) => Promise<unknown>
  onDelete: () => Promise<unknown>
}

/** Upload/preview/remoção da imagem opcional da pergunta (CONT-RF-013). */
export function ImageUploadField({ imageUrl, isUploading, isDeleting, onUpload, onDelete }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de imagem inválido — use JPEG, PNG ou WEBP.")
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem excede o tamanho máximo de 2 MB.")
      return
    }

    try {
      await onUpload(file)
      toast.success("Imagem enviada.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível enviar a imagem."
      toast.error(message)
    }
  }

  async function handleDelete() {
    try {
      await onDelete()
      toast.success("Imagem removida.")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível remover a imagem."
      toast.error(message)
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium leading-none">Imagem (opcional)</span>
      {imageUrl && (
        <div className="flex items-center gap-3">
          <img src={imageUrl} alt="Imagem da pergunta" className="h-20 w-20 rounded-md border object-cover" />
          <Button type="button" variant="outline" size="sm" loading={isDeleting} onClick={handleDelete}>
            Remover imagem
          </Button>
        </div>
      )}
      {!imageUrl && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" variant="outline" size="sm" loading={isUploading} onClick={() => inputRef.current?.click()}>
            Enviar imagem
          </Button>
        </div>
      )}
    </div>
  )
}
