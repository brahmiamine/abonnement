import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { defaultSettings, initialSettings, uid } from '../config'
import { readStoredTheme, storeTheme, themeColor } from '../domain/theme'
import { rollAutoRenewalForward } from '../domain/subscriptions'
import type { BackupPayload } from '../domain/backup'
import { customLogo } from '../data/providers'
import { ensureProviders, loadCategories } from '../lib/providersDb'
import {
  appendOp,
  isNetworkError,
  readQueue,
  readSnapshot,
  writeQueue,
  writeSnapshot,
  type PendingOp,
} from '../lib/offline'
import { loadSubscriptions, loadUserSettings, saveUserSettings } from '../lib/subscriptionsDb'
import { flushQueue, runOp } from '../lib/syncQueue'
import type {
  Category,
  Provider,
  Settings,
  Subscription,
  SubscriptionDraft,
  SyncState,
} from '../types'

const byName = (a: Provider, b: Provider) => a.name.localeCompare(b.name, 'fr')

export function useAppData(session: Session | null) {
  const userId = session?.user.id
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [settings, setSettings] = useState<Settings>(initialSettings)
  const [providers, setProviders] = useState<Provider[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dataReady, setDataReady] = useState(false)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [loadFailed, setLoadFailed] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [previousUserId, setPreviousUserId] = useState(userId)

  const queueRef = useRef<PendingOp[]>([])
  const flushing = useRef(false)
  const fromSnapshot = useRef(false)

  // Déconnexion : on repart d'un état vide (ajustement pendant le rendu, sans effet).
  if (previousUserId !== userId) {
    setPreviousUserId(userId)
    if (!userId) {
      setSubscriptions([])
      setProviders([])
      setCategories([])
      setSettings(initialSettings())
      setDataReady(false)
      setLoadFailed(false)
      setPendingCount(0)
      setSyncState('idle')
    }
  }

  const persistQueue = useCallback(
    (queue: PendingOp[]) => {
      queueRef.current = queue
      if (userId) writeQueue(userId, queue)
      setPendingCount(queue.length)
    },
    [userId],
  )

  const enqueue = useCallback(
    (ops: PendingOp[]) => persistQueue(ops.reduce(appendOp, queueRef.current)),
    [persistQueue],
  )

  /** Rejoue les écritures en attente ; renvoie vrai si la file est vide ensuite. */
  const flush = useCallback(async () => {
    if (!userId || flushing.current) return !queueRef.current.length
    if (!queueRef.current.length) return true

    flushing.current = true
    setSyncState('syncing')
    try {
      const { remaining, failed } = await flushQueue(queueRef.current, userId)
      persistQueue(remaining)
      setSyncState(remaining.length ? 'offline' : failed ? 'error' : 'idle')
      return !remaining.length
    } finally {
      flushing.current = false
    }
  }, [userId, persistQueue])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const applyData = (
      items: Subscription[],
      nextProviders: Provider[],
      nextCategories: Category[],
      nextSettings: Settings,
    ) => {
      setSubscriptions(items)
      setProviders(nextProviders)
      setCategories(nextCategories)
      setSettings({
        ...defaultSettings,
        ...nextSettings,
        // Le choix fait sur cet appareil prime sur la valeur distante.
        theme: readStoredTheme() ?? nextSettings.theme ?? defaultSettings.theme,
      })
    }

    const load = async () => {
      setDataReady(false)
      setLoadFailed(false)
      setSyncState('syncing')
      persistQueue(readQueue(userId))

      try {
        // Les modifications faites hors ligne partent avant de relire le serveur.
        if (!(await flush())) throw new TypeError('Failed to fetch')

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

        await Promise.all(
          changedRenewals.map((item) => runOp({ type: 'upsertSubscription', item }, userId)),
        )

        if (!remoteSettings) {
          await saveUserSettings(defaultSettings, userId)
        }

        if (cancelled) return

        fromSnapshot.current = false
        applyData(normalized, remoteProviders, remoteCategories, {
          ...defaultSettings,
          ...(remoteSettings || {}),
        })
        setSyncState('idle')
      } catch (error) {
        console.error('Subly data sync failed', error)
        if (cancelled) return

        // Sans réseau (ou si le serveur est en panne), on ouvre la dernière copie locale.
        const snapshot = readSnapshot(userId)
        if (snapshot) {
          fromSnapshot.current = true
          applyData(
            snapshot.subscriptions.map((item) => rollAutoRenewalForward(item)),
            snapshot.providers,
            snapshot.categories,
            snapshot.settings,
          )
          setSyncState(isNetworkError(error) ? 'offline' : 'error')
        } else {
          setLoadFailed(true)
          setSyncState('error')
        }
      } finally {
        if (!cancelled) setDataReady(true)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [userId, reloadKey, flush, persistQueue])

  // Copie locale pour l'ouverture hors ligne.
  useEffect(() => {
    if (!userId || !dataReady || loadFailed) return
    writeSnapshot(userId, { subscriptions, providers, categories, settings })
  }, [userId, dataReady, loadFailed, subscriptions, providers, categories, settings])

  // Retour du réseau : on recharge si on est parti d'une copie locale, sinon on vide la file.
  useEffect(() => {
    if (!userId) return

    const onOnline = () => {
      if (fromSnapshot.current) setReloadKey((key) => key + 1)
      else void flush()
    }

    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [userId, flush])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themeColor(settings.theme))
    // Avant la fin du chargement, le thème par défaut ne doit pas écraser un choix distant.
    if (dataReady) storeTheme(settings.theme)
  }, [settings.theme, dataReady])

  /**
   * Envoie des écritures ; en cas de panne réseau elles sont mises en file et appliquées
   * localement quand même. Un refus du serveur, lui, remonte à l'appelant.
   */
  const mutate = useCallback(
    async (ops: PendingOp[], applyLocal: () => void) => {
      if (!userId) return

      setSyncState('syncing')
      let sent = 0
      try {
        if (!queueRef.current.length) {
          for (; sent < ops.length; sent += 1) await runOp(ops[sent], userId)
        }
      } catch (error) {
        if (!isNetworkError(error)) {
          console.error('Subly write failed', error)
          setSyncState('error')
          throw error
        }
      }

      const unsent = ops.slice(sent)
      if (unsent.length) enqueue(unsent)
      applyLocal()

      if (!unsent.length) setSyncState('idle')
      else if (queueRef.current.length > unsent.length) void flush()
      else setSyncState('offline')
    },
    [userId, enqueue, flush],
  )

  useEffect(() => {
    if (!userId || !dataReady) return

    const timer = window.setTimeout(() => {
      mutate([{ type: 'saveSettings', settings }], () => {}).catch(() => {
        // L'état « erreur » est déjà affiché ; les réglages seront renvoyés au prochain changement.
      })
    }, 400)

    return () => window.clearTimeout(timer)
  }, [settings, userId, dataReady, mutate])

  const saveSubscription = useCallback(
    async (draft: SubscriptionDraft, existing: Subscription | null) => {
      if (!userId) return

      const ops: PendingOp[] = []
      let normalizedDraft = draft
      let created: Provider | null = null

      if (!draft.providerId) {
        created = {
          id: `custom-${uid()}`,
          name: draft.name.trim(),
          category: draft.category,
          logo: draft.logo || customLogo(draft.website),
          website: draft.website || '',
          color: '#111827',
        }
        ops.push({ type: 'saveProvider', provider: created })
        normalizedDraft = { ...draft, providerId: created.id, logo: created.logo }
      }

      const item: Subscription = existing
        ? { ...existing, ...normalizedDraft }
        : { ...normalizedDraft, id: uid(), createdAt: new Date().toISOString() }
      ops.push({ type: 'upsertSubscription', item })

      await mutate(ops, () => {
        if (created) setProviders((items) => [...items, created].sort(byName))
        setSubscriptions((items) =>
          existing
            ? items.map((current) => (current.id === existing.id ? item : current))
            : [...items, item],
        )
      })
    },
    [userId, mutate],
  )

  const deleteSubscription = useCallback(
    (id: string) =>
      mutate([{ type: 'removeSubscription', id }], () =>
        setSubscriptions((items) => items.filter((item) => item.id !== id)),
      ),
    [mutate],
  )

  const saveProvider = useCallback(
    async (provider: Provider) => {
      const affected = subscriptions
        .filter((item) => item.providerId === provider.id)
        .map((item) => ({
          ...item,
          name: provider.name,
          logo: provider.logo,
          website: provider.website || undefined,
          category: provider.category,
        }))

      const ops: PendingOp[] = [
        { type: 'saveProvider', provider },
        ...affected.map((item): PendingOp => ({ type: 'upsertSubscription', item })),
      ]

      await mutate(ops, () => {
        setProviders((items) => {
          const exists = items.some((item) => item.id === provider.id)
          const next = exists
            ? items.map((item) => (item.id === provider.id ? provider : item))
            : [...items, provider]
          return next.sort(byName)
        })

        if (affected.length) {
          const byId = new Map(affected.map((item) => [item.id, item]))
          setSubscriptions((items) => items.map((item) => byId.get(item.id) || item))
        }
      })
    },
    [subscriptions, mutate],
  )

  const deleteProvider = useCallback(
    (id: string) =>
      mutate([{ type: 'deleteProvider', id }], () =>
        setProviders((items) => items.filter((item) => item.id !== id)),
      ),
    [mutate],
  )

  const clearSubscriptions = useCallback(
    () => mutate([{ type: 'clearSubscriptions' }], () => setSubscriptions([])),
    [mutate],
  )

  const importBackup = useCallback(
    (payload: BackupPayload) =>
      mutate(
        [
          ...payload.providers.map((provider): PendingOp => ({ type: 'saveProvider', provider })),
          ...payload.subscriptions.map((item): PendingOp => ({ type: 'upsertSubscription', item })),
          { type: 'saveSettings', settings: payload.settings },
        ],
        () => {
          if (payload.providers.length) setProviders([...payload.providers].sort(byName))
          setSubscriptions(payload.subscriptions)
          setSettings(payload.settings)
        },
      ),
    [mutate],
  )

  /** Bouton « Réessayer » : relit le serveur (et renvoie d'abord les modifications en attente). */
  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

  return {
    subscriptions,
    settings,
    setSettings,
    providers,
    categories,
    dataReady,
    syncState,
    pendingCount,
    retry,
    saveSubscription,
    deleteSubscription,
    saveProvider,
    deleteProvider,
    clearSubscriptions,
    importBackup,
  }
}
