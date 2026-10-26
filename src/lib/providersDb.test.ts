import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
const tables: Record<string, Row[]> = {}
const inserted: Row[][] = []

// Simule l'API : routes /categories, /provider-templates et /providers.
vi.mock('./api', () => {
  const tableFor: Record<string, string> = {
    '/categories': 'subscription_categories',
    '/provider-templates': 'subscription_provider_templates',
    '/providers': 'subscription_providers',
  }
  const api = async (method: string, path: string, body?: Row[]) => {
    if (method === 'GET') return [...(tables[tableFor[path]] ?? [])]
    if (method === 'PUT') {
      const list = (tables.subscription_providers ??= [])
      inserted.push(body!)
      for (const row of body!) {
        const index = list.findIndex((item) => item.id === row.id)
        if (index >= 0) list[index] = row
        else list.push(row)
      }
      return
    }
    if (method === 'DELETE') {
      const id = decodeURIComponent(path.split('/').pop()!)
      tables.subscription_providers = (tables.subscription_providers ?? []).filter((item) => item.id !== id)
    }
  }
  return { api }
})

const { ensureProviders, deleteProvider, loadCategories, saveProvider } = await import('./providersDb')

const row = (id: string, name: string) => ({ id, name, category: 'Streaming', logo: '', website: null, color: null })

beforeEach(() => {
  for (const key of Object.keys(tables)) delete tables[key]
  inserted.length = 0
  localStorage.clear()
})

describe('ensureProviders', () => {
  it('ajoute Free Mobile et les IPTV à un catalogue existant', async () => {
    tables.subscription_providers = [row('netflix', 'Netflix')]
    const result = await ensureProviders('u1')
    expect(result.map((item) => item.name)).toEqual(
      expect.arrayContaining(['Netflix', 'Free Mobile', 'Strong8K IPTV', 'Trex IPTV', 'King365 IPTV']),
    )
  })

  it('est idempotent : un second appel n’ajoute rien', async () => {
    tables.subscription_providers = [row('netflix', 'Netflix')]
    await ensureProviders('u1')
    const count = tables.subscription_providers.length
    await ensureProviders('u1')
    expect(tables.subscription_providers).toHaveLength(count)
  })

  it('ne rajoute pas un fournisseur supprimé par l’utilisateur', async () => {
    tables.subscription_providers = [row('netflix', 'Netflix')]
    await ensureProviders('u1')
    await deleteProvider('trex-iptv')
    const result = await ensureProviders('u1')
    expect(result.map((item) => item.id)).not.toContain('trex-iptv')
  })

  it('ne duplique pas un fournisseur déjà présent sous le même nom', async () => {
    tables.subscription_providers = [row('mine', 'Free Mobile')]
    const result = await ensureProviders('u1')
    expect(result.filter((item) => item.name === 'Free Mobile')).toHaveLength(1)
  })

  it('copie d’abord les modèles pour un nouveau compte, puis ajoute les extras', async () => {
    tables.subscription_provider_templates = [row('spotify', 'Spotify')]
    const result = await ensureProviders('u1')
    expect(inserted[0]).toHaveLength(1)
    expect(result.map((item) => item.id)).toEqual(expect.arrayContaining(['spotify', 'free-mobile']))
  })

  it('cloisonne le suivi des ajouts par utilisateur', async () => {
    tables.subscription_providers = [row('netflix', 'Netflix')]
    await ensureProviders('u1')
    expect(localStorage.getItem('subly-seeded-providers-v1:u1')).toContain('free-mobile')
    expect(localStorage.getItem('subly-seeded-providers-v1:u2')).toBeNull()
  })
})

describe('saveProvider / loadCategories', () => {
  it('enregistre avec les valeurs par défaut attendues', async () => {
    await saveProvider({ id: 'x', name: 'X', category: 'Autre', logo: '', website: '', color: '' }, 'u1')
    expect(tables.subscription_providers[0]).toMatchObject({ id: 'x', website: null, color: null, logo: '' })
  })

  it('charge les catégories', async () => {
    tables.subscription_categories = [{ id: 'IA', label: 'IA' }, { id: 'Cloud', label: 'Cloud' }]
    expect(await loadCategories()).toEqual(['IA', 'Cloud'])
  })
})
