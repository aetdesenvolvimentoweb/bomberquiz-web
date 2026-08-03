import { useCallback } from "react"
import { useRegisterSW } from "virtual:pwa-register/react"

export function useServiceWorkerUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker: reloadWithNewServiceWorker,
  } = useRegisterSW()

  const dismiss = useCallback(() => setNeedRefresh(false), [setNeedRefresh])
  const updateServiceWorker = useCallback(() => reloadWithNewServiceWorker(true), [reloadWithNewServiceWorker])

  return { needRefresh, dismiss, updateServiceWorker }
}
