/** Durée de l'animation de sortie des modales / bottom-sheets (doit suivre styles.css). */
export const EXIT_MS = 260

/**
 * Vrai si le navigateur peut animer et que l'utilisateur ne demande pas moins de mouvement.
 * Sans `matchMedia` (jsdom, vieux navigateurs) on considère que non : tout s'affiche directement.
 */
export function motionAllowed() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Délai d'apparition en cascade, plafonné pour les longues listes. */
export const cascade = (index: number, step = 55, base = 0, max = 10) =>
  ({ '--d': `${base + Math.min(index, max) * step}ms` }) as React.CSSProperties
