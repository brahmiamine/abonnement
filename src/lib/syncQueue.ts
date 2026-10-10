import { deleteProvider, saveProvider } from './providersDb'
import { isNetworkError, type PendingOp } from './offline'
import {
  removeAllSubscriptions,
  removeSubscription,
  saveUserSettings,
  upsertSubscription,
} from './subscriptionsDb'

/** Exécute une écriture vers Supabase. */
export function runOp(op: PendingOp, userId: string): Promise<void> {
  switch (op.type) {
    case 'upsertSubscription':
      return upsertSubscription(op.item, userId)
    case 'removeSubscription':
      return removeSubscription(op.id)
    case 'clearSubscriptions':
      return removeAllSubscriptions(userId)
    case 'saveProvider':
      return saveProvider(op.provider, userId)
    case 'deleteProvider':
      return deleteProvider(op.id)
    case 'saveSettings':
      return saveUserSettings(op.settings, userId)
  }
}

/**
 * Rejoue les écritures dans l'ordre. S'arrête à la première panne réseau (le reste attend) ;
 * une écriture refusée par le serveur est abandonnée pour ne pas bloquer la file.
 */
export async function flushQueue(
  queue: PendingOp[],
  userId: string,
): Promise<{ remaining: PendingOp[]; failed: number }> {
  let failed = 0
  for (let index = 0; index < queue.length; index += 1) {
    try {
      await runOp(queue[index], userId)
    } catch (error) {
      if (isNetworkError(error)) return { remaining: queue.slice(index), failed }
      console.error('Écriture hors ligne refusée par le serveur', queue[index], error)
      failed += 1
    }
  }
  return { remaining: [], failed }
}
