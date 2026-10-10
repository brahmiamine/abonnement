import { describe, expect, it } from 'vitest'
import { provider } from '../test/fixtures'
import { EXTRA_PROVIDERS, customLogo, missingExtraProviders } from './providers'

describe('EXTRA_PROVIDERS', () => {
  it('contient Free Mobile et les trois IPTV demandés', () => {
    expect(EXTRA_PROVIDERS.map((item) => item.name)).toEqual([
      'Free Mobile',
      'Strong8K IPTV',
      'Trex IPTV',
      'King365 IPTV',
    ])
  })

  it('range Free Mobile en Télécom et les IPTV en Streaming', () => {
    const byName = Object.fromEntries(EXTRA_PROVIDERS.map((item) => [item.name, item.category]))
    expect(byName['Free Mobile']).toBe('Télécom')
    expect(byName['Strong8K IPTV']).toBe('Streaming')
    expect(byName['Trex IPTV']).toBe('Streaming')
    expect(byName['King365 IPTV']).toBe('Streaming')
  })

  it('a des identifiants uniques et un logo issu du site', () => {
    const ids = EXTRA_PROVIDERS.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const item of EXTRA_PROVIDERS) {
      expect(item.logo).toContain('favicons?domain=')
      expect(item.website).toMatch(/^https:\/\//)
    }
  })
})

describe('customLogo', () => {
  it('retourne une chaîne vide sans site', () => {
    expect(customLogo()).toBe('')
    expect(customLogo('')).toBe('')
  })

  it('extrait le domaine d’une URL complète', () => {
    expect(customLogo('https://exemple.fr/chemin?a=1')).toContain('domain=exemple.fr&')
  })
})

describe('missingExtraProviders', () => {
  it('retourne tout quand le catalogue est vide', () => {
    expect(missingExtraProviders([])).toHaveLength(4)
  })

  it('ignore ceux déjà présents par identifiant', () => {
    const current = [provider({ id: 'free-mobile', name: 'Autre nom' })]
    expect(missingExtraProviders(current).map((item) => item.id)).not.toContain('free-mobile')
  })

  it('ignore ceux déjà présents par nom, sans tenir compte de la casse ni des espaces', () => {
    const current = [
      provider({ id: 'x', name: 'FREE  mobile' }),
      provider({ id: 'y', name: 'trex-iptv' }),
    ]
    const names = missingExtraProviders(current).map((item) => item.name)
    expect(names).toEqual(['Strong8K IPTV', 'King365 IPTV'])
  })

  it('ne ressuscite pas un fournisseur déjà semé puis supprimé', () => {
    const result = missingExtraProviders([], ['king365-iptv'])
    expect(result.map((item) => item.id)).not.toContain('king365-iptv')
    expect(result).toHaveLength(3)
  })

  it('retourne une liste vide quand tout est déjà semé', () => {
    expect(
      missingExtraProviders(
        [],
        EXTRA_PROVIDERS.map((item) => item.id),
      ),
    ).toEqual([])
  })
})
