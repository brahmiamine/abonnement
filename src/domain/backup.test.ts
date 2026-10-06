import { describe, expect, it } from 'vitest'
import { provider, subscription } from '../test/fixtures'
import { createBackup, parseBackup, serializeBackup } from './backup'

describe('sauvegarde', () => {
  const settings = { theme: 'light', remindersEnabled: true } as const

  it('fait l’aller-retour export → import', () => {
    const backup = createBackup([subscription()], [provider()], settings)
    const parsed = parseBackup(serializeBackup(backup))
    expect(parsed.subscriptions).toEqual(backup.subscriptions)
    expect(parsed.providers).toEqual(backup.providers)
    expect(parsed.settings).toEqual(settings)
    expect(parsed.version).toBe(2)
  })

  it('rejette un JSON invalide', () => {
    expect(() => parseBackup('pas du json')).toThrow()
  })

  it('rejette un fichier sans abonnements ou sans réglages', () => {
    expect(() => parseBackup('{}')).toThrow('Invalid Subly backup')
    expect(() => parseBackup(JSON.stringify({ subscriptions: [] }))).toThrow()
  })

  it('accepte une ancienne sauvegarde sans fournisseurs', () => {
    const parsed = parseBackup(JSON.stringify({ subscriptions: [], settings: { theme: 'x' } }))
    expect(parsed.providers).toEqual([])
    expect(parsed.settings).toEqual({ theme: 'dark', remindersEnabled: false })
  })
})
