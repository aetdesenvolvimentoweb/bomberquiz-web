import { useCallback, useRef, useState, type ChangeEvent } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { UserAvatar } from "@/components/user-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRemoveAvatar, useUploadAvatar } from "@/features/profile/api"
import type { SessionUser } from "@/features/session/use-session"
import { ApiError } from "@/lib/api/errors"
import { cropToAvatarBlob } from "@/lib/crop-image"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]
// Limite da foto ORIGINAL escolhida. O que sobe é o recorte reduzido (dezenas
// de KB); este teto só evita travar o navegador com um arquivo absurdo.
const MAX_SOURCE_BYTES = 20 * 1024 * 1024

/**
 * Foto do perfil (PROF-RF-005): escolher arquivo → recortar em quadrado com
 * zoom → o navegador reduz para 512×512 e envia. Remover volta às iniciais.
 */
export function AvatarEditor({ user }: { user: SessionUser }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const uploadMutation = useUploadAvatar()
  const removeMutation = useRemoveAvatar()

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => setCroppedArea(areaPixels), [])

  function closeCropper() {
    if (source) URL.revokeObjectURL(source)
    setSource(null)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Permite escolher o mesmo arquivo de novo depois de cancelar.
    event.target.value = ""
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use uma foto JPEG, PNG ou WEBP.")
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("Essa foto é grande demais. Escolha uma com até 20 MB.")
      return
    }
    setSource(URL.createObjectURL(file))
  }

  async function onSave() {
    if (!source || !croppedArea) return
    setProcessing(true)
    try {
      const image = await cropToAvatarBlob(source, croppedArea)
      await uploadMutation.mutateAsync(image)
      toast.success("Foto atualizada.")
      closeCropper()
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Não foi possível enviar a foto.")
    } finally {
      setProcessing(false)
    }
  }

  async function onRemove() {
    try {
      await removeMutation.mutateAsync(undefined)
      toast.success("Foto removida.")
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover a foto.")
    }
  }

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={64} className="h-16 w-16 bg-ember text-lg text-ember-foreground" />
      <div className="min-w-0">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-1 flex gap-3 text-sm">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {user.avatarUrl ? "Trocar foto" : "Adicionar foto"}
          </button>
          {user.avatarUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={removeMutation.isPending}
              className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            >
              {removeMutation.isPending ? "Removendo…" : "Remover"}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          aria-label="Escolher foto"
          onChange={onFileSelected}
        />
      </div>

      <Dialog open={source !== null} onOpenChange={(open) => !open && !processing && closeCropper()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
            <DialogDescription>Arraste para enquadrar e use o controle para aproximar.</DialogDescription>
          </DialogHeader>
          {source && (
            <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}
          <Slider
            aria-label="Zoom"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([value]) => setZoom(value ?? 1)}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCropper} disabled={processing}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSave} loading={processing}>
              Salvar foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
