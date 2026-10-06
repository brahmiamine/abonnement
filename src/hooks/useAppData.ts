import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { defaultSettings, uid } from '../config'
import { rollAutoRenewalForward } from '../domain/subscriptions'
import type { BackupPayload } from '../domain/backup'
import { customLogo } from '../data/providers'
import {
  deleteProvider as deleteProviderFromDb,
  ensureProviders,
  loadCategories,
  saveProvider as saveProviderToDb,
} from '../lib/providersDb'
import {
  loadSubscriptions,
  loadUserSettings,
  removeAllSubscriptions,
  removeSubscription,
  saveUserSettings,
  upsertSubscription,
  upsertSubscriptions,
} from '../lib/subscriptionsDb'
import type {
  Category,
  Provider,
  Settings,
  Subscription,
  SubscriptionDraft,
  SyncState,
} from '../types'

export function useAppData(session: Session | null) {
  const userId = session?.user.id
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [providers, setProviders] = useState<Provider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dataReady, setDataReady] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('idle')

  useEffect(() => {
    if (!userId) {
      setSubscriptions([])
      setProviders([])
      setCategories([])
      setSettings(defaultSettings)
      setDataReady(false)
      setSyncState('idle')
      return
    }

    let cancelled = false

    const load = async () => {
      setDataReady(false)
      setSyncState('syncing')

      try {
        const [remoteItems, remoteSettings, remoteProviders, remoteCategories] = await Promise.all([
          loadSubscriptions(),
          loadUserSettings(),
          ensureProviders(userId),
          loadCategories(),
        ])

        const normalized = remoteItems.map((item) => rollAutoRenewalForward(item))
        const changedRenewals = normalized.filter(
          (item, index) => item.renewalDate !== remoteItems[index]?.renewalDate,
        )

        if (changedRenewals.length) {
          await upsertSubscriptions(changedRenewals, userId)
        }

        if (!remoteSettings) {
          await saveUserSettings(defaultSettings, userId)
        }

        if (cancelled) return

        setSubscriptions(normalized)
        setProviders(remoteProviders)
        setCategories(remoteCategories)
        setSettings({ ...defaultSettings, ...(remoteSettings || {}) })
        setSyncState('idle')
      } catch (error) {
        console.error('Subly data sync failed', error)
        if (!cancelled) setSyncState('error')
      } finally {
        if (!cancelled) setDataReady(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', settings.theme === 'dark' ? '#0b1020' : '#f5f7fb')
  }, [settings.theme])

  useEffect(() => {
    if (!userId || !dataReady) return

    const timer = window.setTimeout(async () => {
      setSyncState('syncing')
      try {
        await saveUserSettings(settings, userId)
        setSyncState('idle')
      } catch (error) {
        console.error('Settings sync failed', error)
        setSyncState('error')
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [settings, userId, dataReady])

  const saveSubscription = useCallback(async (
    draft: SubscriptionDraft,
    existing: Subscription | null,
  ) => {
    if (!userId) return

    setSyncState('syncing')
    try {
      let normalizedDraft = draft

      if (!draft.providerId) {
        const provider: Provider = {
          id: `custom-${uid()}`,
          name: draft.name.trim(),
          category: draft.category,
          logo: draft.logo || customLogo(draft.website),
          website: draft.website || '',
          color: '#111827',
        }

        await saveProviderToDb(provider, userId)
        setProviders((items) =>
          [...items, provider].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        )
        normalizedDraft = { ...draft, providerId: provider.id, logo: provider.logo }
      }

      const item: Subscription = existing
        ? { ...existing, ...normalizedDraft }
        : { ...normalizedDraft, id: uid(), createdAt: new Date().toISOString() }

      await upsertSubscription(item, userId)

      setSubscriptions((items) =>
        existing
          ? items.map((current) => current.id === existing.id ? item : current)
          : [...items, item],
      )
      setSyncState('idle')
    } catch (error) {
      console.error('Subscription save failed', error)
      setSyncState('error')
      throw error
    }
  }, [userId])

  const deleteSubscription = useCallback(async (id: string) => {
    setSyncState('syncing')
    try {
      await removeSubscription(id)
      setSubscriptions((items) => items.filter((item) => item.id !== id))
      setSyncState('idle')
    } catch (error) {
      console.error('Subscription delete failed', error)
      setSyncState('error')
      throw error
    }
  }, [])

  const saveProvider = useCallback(async (provider: Provider) => {
    if (!userId) return

    setSyncState('syncing')
    try {
      const affected = subscriptions
        .filter((item) => item.providerId === provider.id)
        .map((item) => ({
          ...item,
          name: provider.name,
          logo: provider.logo,
          website: provider.website || undefined,
          category: provider.category,
        }))

      await saveProviderToDb(provider, userId)
      if (affected.length) await upsertSubscriptions(affected, userId)

      setProviders((items) => {
        const exists = items.some((item) => item.id === provider.id)
        const next = exists
          ? items.map((item) => item.id === provider.id ? provider : item)
          : [...items, provider]
        return next.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      })

      if (affected.length) {
        const byId = new Map(affected.map((item) => [item.id, item]))
        setSubscriptions((items) => items.map((item) => byId.get(item.id) || item))
      }

      setSyncState('idle')
    } catch (error) {
      console.error('Provider save failed', error)
      setSyncState('error')
      throw error
    }
  }, [subscriptions, userId])

  const deleteProvider = useCallback(async (id: string) => {
    setSyncState('syncing')
    try {
      await deleteProviderFromDb(id)
      setProviders((items) => items.filter((item) => item.id !== id))
      setSyncState('idle')
    } catch (error) {
      console.error('Provider delete failed', error)
      setSyncState('error')
      throw error
    }
  }, [])

  const clearSubscriptions = useCallback(async () => {
    if (!userId) return

    setSyncState('syncing')
    try {
      await removeAllSubscriptions(userId)
      setSubscriptions([])
      setSyncState('idle')
    } catch (error) {
      console.error('Clear subscriptions failed', error)
      setSyncState('error')
      throw error
    }
  }, [userId])

  const importBackup = useCallback(async (payload: BackupPayload) => {
    if (!userId) return

    setSyncState('syncing')
    try {
      if (payload.providers.length) {
        await Promise.all(payload.providers.map((provider) => saveProviderToDb(provider, userId)))
      }
      await upsertSubscriptions(payload.subscriptions, userId)
      await saveUserSettings(payload.settings, userId)

      if (payload.providers.length) {
        setProviders([...payload.providers].sort((a, b) => a.name.localeCompare(b.name, 'fr')))
      }
      setSubscriptions(payload.subscriptions)
      setSettings(payload.settings)
      setSyncState('idle')
    } catch (error) {
      console.error('Backup import failed', error)
      setSyncState('error')
      throw error
    }
  }, [userId])

  return {
    subscriptions,
    settings,
    setSettings,
    providers,
    categories,
    dataReady,
    syncState,
    saveSubscription,
    deleteSubscription,
    saveProvider,
    deleteProvider,
    clearSubscriptions,
    importBackup,
  }
}
