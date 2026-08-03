import { useEffect, useState } from "react"

// Espelha o padrão de use-install-prompt.ts: um hook por preocupação, consumido
// onde for preciso (ex.: sessão de quiz, pra medir período offline).
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { isOnline }
}
