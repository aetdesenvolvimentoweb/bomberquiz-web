import { Share } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useInstallPrompt } from "@/features/pwa/use-install-prompt"

export function InstallBanner() {
  const { platform, promptInstall, dismiss } = useInstallPrompt()

  if (!platform) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 p-4 sm:bottom-4 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">Instale o BomberQuiz</p>

          {platform === "android" ? (
            <p className="text-sm text-muted-foreground">
              Adicione à tela inicial para acessar mais rápido, inclusive offline.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Toque em <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" /> Compartilhar e
              depois em "Adicionar à Tela de Início".
            </p>
          )}

          <div className="flex gap-2">
            {platform === "android" && (
              <Button size="sm" onClick={promptInstall}>
                Instalar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Agora não
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
