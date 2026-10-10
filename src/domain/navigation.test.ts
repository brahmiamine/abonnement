import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW, VIEWS, hashFromView, isView, navTabFor, viewFromHash } from './navigation'

describe('viewFromHash', () => {
  it.each(VIEWS)('lit #/%s', (view) => {
    expect(viewFromHash(`#/${view}`)).toBe(view)
  })

  it('accepte aussi #view sans slash', () => {
    expect(viewFromHash('#expenses')).toBe('expenses')
  })

  it('ignore ce qui suit la vue', () => {
    expect(viewFromHash('#/settings/autre')).toBe('settings')
    expect(viewFromHash('#/settings?x=1')).toBe('settings')
  })

  it.each(['', '#', '#/', '#/inconnu', '#/HOME', '#/__proto__'])(
    'retombe sur l’accueil pour %j',
    (hash) => {
      expect(viewFromHash(hash)).toBe(DEFAULT_VIEW)
    },
  )
})

describe('hashFromView', () => {
  it('est l’inverse de viewFromHash', () => {
    for (const view of VIEWS) expect(viewFromHash(hashFromView(view))).toBe(view)
  })
})

describe('isView', () => {
  it('valide uniquement les vues connues', () => {
    expect(isView('home')).toBe(true)
    expect(isView('nope')).toBe(false)
  })
})

describe('navTabFor', () => {
  it('rattache Fournisseurs à Réglages', () => {
    expect(navTabFor('providers')).toBe('settings')
  })

  it('laisse les autres vues inchangées', () => {
    expect(navTabFor('home')).toBe('home')
    expect(navTabFor('expenses')).toBe('expenses')
  })
})
