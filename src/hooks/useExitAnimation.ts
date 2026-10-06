import { useCallback, useEffect, useRef, useState } from 'react'
import { EXIT_MS, motionAllowed } from '../utils/motion'

/**
 * Ferme une modale après son animation de sortie.
 * `closing` passe à vrai pendant l'animation, puis `onClose` est appelé.
 */
export function useExitAnimation(onClose: () => void) {
  const [closing, setClosing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef(onClose)
  latest.current = onClose

  useEffect(() => () => clearTimeout(timer.current), [])

  const close = useCallback(() => {
    if (!motionAllowed()) {
      latest.current()
      return
    }
    if (timer.current) return
    setClosing(true)
    timer.current = setTimeout(() => latest.current(), EXIT_MS)
  }, [])

  return [closing, close] as const
}
