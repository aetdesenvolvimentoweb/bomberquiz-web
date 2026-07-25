import { useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

// Espelha a regra do backend (AIGEN-RF-001 CA-2) — checagem client-side é só
// UX, o backend revalida a assinatura binária (%PDF-) e o tamanho de qualquer
// forma. Mesmo espírito de image-upload-field.tsx, para um arquivo maior.
const MAX_PDF_BYTES = 20 * 1024 * 1024

export interface AiGenerationPdfPickerProps {
  label: string
  file: File | null
  onChange: (file: File) => void
}

/** Seleção de 1 PDF (prova de referência OU material de estudo — usado 2x na página de criação). */
export function AiGenerationPdfPicker({ label, file, onChange }: AiGenerationPdfPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    e.target.value = ""
    if (!selected) return

    if (selected.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF.")
      return
    }
    if (selected.size > MAX_PDF_BYTES) {
      toast.error("O arquivo excede o tamanho máximo de 20 MB.")
      return
    }

    onChange(selected)
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium leading-none">{label}</span>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          aria-label={label}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {file ? "Trocar arquivo" : "Selecionar arquivo"}
        </Button>
        {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
      </div>
    </div>
  )
}
