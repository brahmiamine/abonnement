import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault()
      setPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleInstall)
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return {
    installAvailable: Boolean(prompt),
    install,
  }
}
