import { useCallback, useEffect, useState } from 'react'
import { disablePush, enablePush, hasPushSubscription, isPushAvailable } from '../lib/push'

/** État des notifications push de cet appareil (les rappels partent alors même application fermée). */
export function usePush(userId: string | undefined) {
  const [active, setActive] = useState(false)
  const available = isPushAvailable()

  useEffect(() => {
    let cancelled = false
    if (!userId || !available) return
    hasPushSubscription().then((value) => {
      if (!cancelled) setActive(value)
    })
    return () => {
      cancelled = true
    }
  }, [userId, available])

  /** Renvoie vrai si l'appareil est abonné ; sinon on retombe sur les notifications locales. */
  const enable = useCallback(async () => {
    if (!userId || !available) return false
    try {
      await enablePush(userId)
      setActive(true)
      return true
    } catch (error) {
      console.error('Activation du push impossible', error)
      return false
    }
  }, [userId, available])

  const disable = useCallback(async () => {
    try {
      await disablePush()
    } catch (error) {
      console.error('Désactivation du push impossible', error)
    }
    setActive(false)
  }, [])

  return { active: available && active, available, enable, disable }
}
