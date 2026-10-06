import type { Page } from '@playwright/test'

export const SCREENS = [
  { hash: 'home', heading: 'Mes abonnements' },
  { hash: 'subscriptions', heading: 'Tous les abonnements' },
  { hash: 'expenses', heading: 'Dépenses' },
  { hash: 'settings', heading: 'Réglages' },
  { hash: 'providers', heading: 'Fournisseurs' },
] as const

/** Éléments dont le bord droit dépasse la largeur de l'écran (cause d'un scroll horizontal). */
export const findOverflowing = (page: Page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const out: string[] = []
    document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      if (el.closest('.filter-row')) return // zone volontairement défilante
      const style = getComputedStyle(el)
      if (style.position === 'fixed' && rect.left >= 0 && rect.right <= width) return
      if (rect.right > width + 0.5 || rect.left < -0.5) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')} [${Math.round(rect.left)}→${Math.round(rect.right)}] > ${width}`)
      }
    })
    return out.slice(0, 15)
  })

export const pageScrollsHorizontally = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
