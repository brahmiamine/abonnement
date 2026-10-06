import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHashView } from './useHashView'

describe('useHashView', () => {
  beforeEach(() => {
    window.location.hash = ''
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  it('démarre sur la vue de l’URL (rafraîchissement)', () => {
    window.location.hash = '#/expenses'
    const { result } = renderHook(() => useHashView())
    expect(result.current[0]).toBe('expenses')
  })

  it('démarre sur l’accueil sans hash', () => {
    const { result } = renderHook(() => useHashView())
    expect(result.current[0]).toBe('home')
  })

  it('met à jour l’URL quand on change de vue', () => {
    const { result } = renderHook(() => useHashView())
    act(() => result.current[1]('settings'))
    expect(result.current[0]).toBe('settings')
    expect(window.location.hash).toBe('#/settings')
  })

  it('remonte en haut de page à chaque changement de vue', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { result } = renderHook(() => useHashView())
    scrollTo.mockClear()
    act(() => result.current[1]('subscriptions'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('remonte aussi quand on reclique sur la vue courante', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const { result } = renderHook(() => useHashView())
    act(() => result.current[1]('expenses'))
    scrollTo.mockClear()
    act(() => result.current[1]('expenses'))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('réagit au bouton précédent (hashchange)', () => {
    const { result } = renderHook(() => useHashView())
    act(() => {
      window.location.hash = '#/providers'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current[0]).toBe('providers')
  })
})
