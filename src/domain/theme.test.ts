import { describe, expect, it, vi } from 'vitest'
import { THEME_KEY, isTheme, readStoredTheme, storeTheme, themeColor } from './theme'

describe('thème', () => {
  it('valide les valeurs', () => {
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('light')).toBe(true)
    expect(isTheme('blue')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })

  it('persiste et relit le thème', () => {
    expect(readStoredTheme()).toBeNull()
    storeTheme('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(readStoredTheme()).toBe('light')
  })

  it('ignore une valeur invalide stockée', () => {
    localStorage.setItem(THEME_KEY, 'rouge')
    expect(readStoredTheme()).toBeNull()
  })

  it('ne plante pas quand le stockage lève une exception', () => {
    const broken = {
      getItem: vi.fn(() => { throw new Error('denied') }),
      setItem: vi.fn(() => { throw new Error('denied') }),
    }
    expect(readStoredTheme(broken)).toBeNull()
    expect(() => storeTheme('dark', broken)).not.toThrow()
  })

  it('donne la couleur de la barre du navigateur', () => {
    expect(themeColor('dark')).toBe('#0b1020')
    expect(themeColor('light')).toBe('#f5f7fb')
  })
})
