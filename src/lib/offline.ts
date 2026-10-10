import type { Category, Provider, Settings, Subscription } from '../types'

/** Copie locale des données : permet d'ouvrir l'application sans réseau. */
export type Snapshot = {
  subscriptions: Subscription[]
  providers: Provider[]
  categories: Category[]
  settings: Settings
  savedAt: string
}

/** Écriture à rejouer vers Supabase quand le réseau revient (toutes idempotentes). */
export type PendingOp =
  | { type: 'upsertSubscription'; item: Subscription }
  | { type: 'removeSubscription'; id: string }
  | { type: 'clearSubscriptions' }
  | { type: 'saveProvider'; provider: Provider }
  | { type: 'deleteProvider'; id: string }
  | { type: 'saveSettings'; settings: Settings }

const snapshotKey = (userId: string) => `subly-snapshot-v1:${userId}`
const queueKey = (userId: string) => `subly-queue-v1:${userId}`

const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota plein ou stockage indisponible : l'application reste utilisable en ligne.
  }
}

export const readSnapshot = (userId: string): Snapshot | null => {
  const value = readJson<Snapshot>(snapshotKey(userId))
  return value && Array.isArray(value.subscriptions) && Array.isArray(value.providers)
    ? value
    : null
}

export const writeSnapshot = (userId: string, snapshot: Omit<Snapshot, 'savedAt'>) =>
  writeJson(snapshotKey(userId), { ...snapshot, savedAt: new Date().toISOString() })

export const readQueue = (userId: string): PendingOp[] => {
  const value = readJson<PendingOp[]>(queueKey(userId))
  return Array.isArray(value) ? value : []
}

export const writeQueue = (userId: string, queue: PendingOp[]) => writeJson(queueKey(userId), queue)

export const clearOfflineData = (userId: string) => {
  try {
    localStorage.removeItem(snapshotKey(userId))
    localStorage.removeItem(queueKey(userId))
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}

/** Ajoute une écriture en attente ; seul le dernier état des réglages est conservé. */
export const appendOp = (queue: PendingOp[], op: PendingOp): PendingOp[] =>
  op.type === 'saveSettings'
    ? [...queue.filter((item) => item.type !== 'saveSettings'), op]
    : [...queue, op]

/** Vrai pour une panne de connexion (et non un refus du serveur, qu'il ne faut pas rejouer). */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '')
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout/i.test(
    message,
  )
}
