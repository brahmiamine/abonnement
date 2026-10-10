import type { Settings } from '../types'

export const THEME_KEY = 'subly-theme'

export const isTheme = (value: unknown): value is Settings['theme'] =>
  value === 'dark' || value === 'light'

export function readStoredTheme(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()) {
  try {
    const value = storage?.getItem(THEME_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function storeTheme(
  theme: Settings['theme'],
  storage: Pick<Storage, 'setItem'> | undefined = safeStorage(),
) {
  try {
    storage?.setItem(THEME_KEY, theme)
  } catch {
    // Stockage indisponible (navigation privée) : le thème reste en mémoire.
  }
}

export const themeColor = (theme: Settings['theme']) => (theme === 'dark' ? '#0b1020' : '#f5f7fb')

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}
