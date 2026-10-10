import type { View } from '../types'

export const VIEWS: View[] = ['home', 'subscriptions', 'expenses', 'settings', 'providers']

export const DEFAULT_VIEW: View = 'home'

export const isView = (value: string): value is View => (VIEWS as string[]).includes(value)

/** `#/subscriptions` → `subscriptions` ; toute valeur inconnue retombe sur l'accueil. */
export function viewFromHash(hash: string): View {
  const value = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return isView(value) ? value : DEFAULT_VIEW
}

export const hashFromView = (view: View) => `#/${view}`

/** Onglet de navigation à mettre en surbrillance pour une vue donnée. */
export const navTabFor = (view: View): View => (view === 'providers' ? 'settings' : view)
