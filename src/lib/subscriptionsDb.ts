import type { Settings, Subscription } from '../types'
import { supabase } from './supabase'

type SubscriptionRow = {
  id: string
  user_id: string
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

const SUBSCRIPTION_COLUMNS =
  'id,user_id,provider_id,name,logo,website,category,price,currency,cycle,start_date,renewal_date,expiration_date,status,auto_renew,remind_days,notes,created_at'

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

const toRow = (item: Subscription, userId: string) => ({
  id: item.id,
  user_id: userId,
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

export async function loadSubscriptions() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_COLUMNS)
    .order('renewal_date', { ascending: true })

  if (error) throw error
  return (data as SubscriptionRow[]).map(fromRow)
}

export async function upsertSubscription(item: Subscription, userId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert(toRow(item, userId), { onConflict: 'id' })

  if (error) throw error
}

export async function upsertSubscriptions(items: Subscription[], userId: string) {
  if (!items.length) return

  const { error } = await supabase.from('subscriptions').upsert(
    items.map((item) => toRow(item, userId)),
    { onConflict: 'id' },
  )

  if (error) throw error
}

export async function removeSubscription(id: string) {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id)
  if (error) throw error
}

export async function removeAllSubscriptions(userId: string) {
  const { error } = await supabase.from('subscriptions').delete().eq('user_id', userId)
  if (error) throw error
}

export async function loadUserSettings(): Promise<Partial<Settings> | null> {
  const { data, error } = await supabase
    .from('subscription_settings')
    .select('theme,reminders_enabled')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    theme: data.theme,
    remindersEnabled: data.reminders_enabled,
  }
}

export async function saveUserSettings(settings: Settings, userId: string) {
  const { error } = await supabase.from('subscription_settings').upsert(
    {
      user_id: userId,
      theme: settings.theme,
      reminders_enabled: settings.remindersEnabled,
    },
    { onConflict: 'user_id' },
  )

  if (error) throw error
}
