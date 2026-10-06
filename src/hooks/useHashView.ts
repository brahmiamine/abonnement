import { useCallback, useEffect, useState } from 'react'
import { hashFromView, viewFromHash } from '../domain/navigation'
import type { View } from '../types'

/** Vue courante synchronisée avec l'URL (`#/settings`) : un rafraîchissement reste sur la même page. */
export function useHashView(): [View, (view: View) => void] {
  const [view, setViewState] = useState<View>(() => viewFromHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setViewState(viewFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Chaque changement de page repart du haut de l'écran.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const setView = useCallback((next: View) => {
    const hash = hashFromView(next)
    if (window.location.hash !== hash) window.location.hash = hash
    else window.scrollTo(0, 0)
    setViewState(next)
  }, [])

  return [view, setView]
}
