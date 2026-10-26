import type { Category, Provider } from '../types'
import { missingExtraProviders } from '../data/providers'
import { api } from './api'

type CategoryRow = { id: string; label: string }
type ProviderRow = {
  id: string
  name: string
  category: Category
  logo: string
  website: string | null
  color: string | null
}

const fromRow = (row: ProviderRow): Provider => ({
  id: row.id,
  name: row.name,
  category: row.category,
  logo: row.logo || '',
  website: row.website || '',
  color: row.color || '#111827',
})

export async function loadCategories(): Promise<Category[]> {
  const rows = await api<CategoryRow[]>('GET', '/categories')
  return rows.map((row) => row.id as Category)
}

export async function loadProviderTemplates(): Promise<Provider[]> {
  const rows = await api<ProviderRow[]>('GET', '/provider-templates')
  return rows.map(fromRow)
}

export async function loadProviders(): Promise<Provider[]> {
  const rows = await api<ProviderRow[]>('GET', '/providers')
  return rows.map(fromRow)
}

const toRow = (provider: Provider) => ({
  id: provider.id,
  name: provider.name,
  category: provider.category,
  logo: provider.logo || '',
  website: provider.website || null,
  color: provider.color || null,
})

const seededKey = (userId: string) => `subly-seeded-providers-v1:${userId}`

const readSeeded = (userId: string): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(seededKey(userId)) || '[]')
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

const writeSeeded = (userId: string, ids: string[]) => {
  try {
    localStorage.setItem(seededKey(userId), JSON.stringify(ids))
  } catch {
    // Sans stockage local, l'ajout sera simplement retenté au prochain chargement.
  }
}

// Deux chargements simultanés (StrictMode, onglet réactivé…) partagent le même amorçage.
const inflight = new Map<string, Promise<Provider[]>>()

export function ensureProviders(userId: string): Promise<Provider[]> {
  const pending = inflight.get(userId)
  if (pending) return pending
  const promise = seedProviders(userId).finally(() => inflight.delete(userId))
  inflight.set(userId, promise)
  return promise
}

async function seedProviders(userId: string): Promise<Provider[]> {
  let current = await loadProviders()

  if (!current.length) {
    const templates = await loadProviderTemplates()
    if (templates.length) {
      await api('PUT', '/providers', templates.map(toRow))
      current = await loadProviders()
    }
  }

  const seeded = readSeeded(userId)
  const missing = missingExtraProviders(current, seeded)
  if (missing.length) {
    await Promise.all(missing.map((provider) => saveProvider(provider, userId)))
    writeSeeded(userId, [...new Set([...seeded, ...missing.map((provider) => provider.id)])])
    current = await loadProviders()
  }

  return current
}

export async function saveProvider(provider: Provider, _userId: string) {
  await api('PUT', '/providers', [toRow(provider)])
}

export async function deleteProvider(id: string) {
  await api('DELETE', `/providers/${encodeURIComponent(id)}`)
}
