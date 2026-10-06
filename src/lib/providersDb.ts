import type { Category, Provider } from '../types'
import { supabase } from './supabase'

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
  const { data, error } = await supabase
    .from('subscription_categories')
    .select('id,label')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as CategoryRow[]).map((row) => row.id as Category)
}

export async function loadProviderTemplates(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('subscription_provider_templates')
    .select('id,name,category,logo,website,color')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data as ProviderRow[]).map(fromRow)
}

export async function loadProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('subscription_providers')
    .select('id,name,category,logo,website,color')
    .order('name', { ascending: true })
  if (error) throw error
  return (data as ProviderRow[]).map(fromRow)
}

export async function ensureProviders(userId: string): Promise<Provider[]> {
  const current = await loadProviders()
  if (current.length) return current

  const templates = await loadProviderTemplates()
  if (!templates.length) return []

  const { error } = await supabase.from('subscription_providers').insert(
    templates.map((provider) => ({
      user_id: userId,
      id: provider.id,
      name: provider.name,
      category: provider.category,
      logo: provider.logo,
      website: provider.website || null,
      color: provider.color || null,
    })),
  )
  if (error) throw error
  return loadProviders()
}

export async function saveProvider(provider: Provider, userId: string) {
  const { error } = await supabase.from('subscription_providers').upsert({
    user_id: userId,
    id: provider.id,
    name: provider.name,
    category: provider.category,
    logo: provider.logo || '',
    website: provider.website || null,
    color: provider.color || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,id' })
  if (error) throw error
}

export async function deleteProvider(id: string) {
  const { error } = await supabase.from('subscription_providers').delete().eq('id', id)
  if (error) throw error
}
