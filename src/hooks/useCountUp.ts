import { useEffect, useRef, useState } from 'react'
import { motionAllowed } from '../utils/motion'

const DURATION = 950

/**
 * Fait défiler un nombre de 0 jusqu'à sa valeur à l'apparition du composant.
 * Les changements ultérieurs (ajout, suppression) s'affichent immédiatement.
 */
export function useCountUp(value: number) {
  const [progress, setProgress] = useState(() => (motionAllowed() ? 0 : 1))
  const done = useRef(progress === 1)

  useEffect(() => {
    if (done.current) return
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / DURATION)
      setProgress(1 - Math.pow(1 - k, 3))
      if (k < 1) frame = requestAnimationFrame(step)
      else done.current = true
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [])

  return value * progress
}
