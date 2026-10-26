import type { Settings, Subscription } from '../types'
import { api } from './api'

type SubscriptionRow = {
  id: string
  provider_id: string | null
  name: string
  logo: string
  website: string | null
  category: Subscription['category']
  price: number | string
  currency: 'EUR'
  cycle: Subscription['cycle']
  start_date: string
  renewal_date: string
  expiration_date: string | null
  status: Subscription['status']
  auto_renew: boolean
  remind_days: number[]
  notes: string | null
  created_at: string
}

const fromRow = (row: SubscriptionRow): Subscription => ({
  id: row.id,
  providerId: row.provider_id || undefined,
  name: row.name,
  logo: row.logo || '',
  website: row.website || undefined,
  category: row.category,
  price: Number(row.price),
  currency: row.currency,
  cycle: row.cycle,
  startDate: row.start_date,
  renewalDate: row.renewal_date,
  expirationDate: row.expiration_date || undefined,
  status: row.status,
  autoRenew: row.auto_renew,
  remindDays: row.remind_days || [],
  notes: row.notes || undefined,
  createdAt: row.created_at,
})

const toRow = (item: Subscription) => ({
  id: item.id,
  provider_id: item.providerId || null,
  name: item.name,
  logo: item.logo || '',
  website: item.website || null,
  category: item.category,
  price: item.price,
  currency: item.currency,
  cycle: item.cycle,
  start_date: item.startDate,
  renewal_date: item.renewalDate,
  expiration_date: item.expirationDate || null,
  status: item.status,
  auto_renew: item.autoRenew,
  remind_days: item.remindDays,
  notes: item.notes || null,
})

// userId est conservé dans les signatures : l'API déduit l'utilisateur de la session.
export async function loadSubscriptions() {
  const rows = await api<SubscriptionRow[]>('GET', '/subscriptions')
  return rows.map(fromRow)
}

export async function upsertSubscription(item: Subscription, _userId: string) {
  await api('PUT', '/subscriptions', [toRow(item)])
}

export async function upsertSubscriptions(items: Subscription[], _userId: string) {
  if (!items.length) return
  await api('PUT', '/subscriptions', items.map(toRow))
}

export async function removeSubscription(id: string) {
  await api('DELETE', `/subscriptions/${encodeURIComponent(id)}`)
}

export async function removeAllSubscriptions(_userId: string) {
  await api('DELETE', '/subscriptions')
}

export async function loadUserSettings(): Promise<Partial<Settings> | null> {
  const { settings } = await api<{ settings: { theme: Settings['theme']; reminders_enabled: boolean } | null }>('GET', '/settings')
  if (!settings) return null

  return {
    theme: settings.theme,
    remindersEnabled: settings.reminders_enabled,
  }
}

export async function saveUserSettings(settings: Settings, _userId: string) {
  await api('PUT', '/settings', {
    theme: settings.theme,
    reminders_enabled: settings.remindersEnabled,
  })
}
