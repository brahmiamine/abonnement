import { CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import type { SyncState } from '../../types'

/** Message visible (et annoncé) quand la synchronisation est interrompue, avec un bouton pour réessayer. */
export function SyncBanner({
  syncState,
  pendingCount,
  onRetry,
}: {
  syncState: SyncState
  pendingCount: number
  onRetry: () => void
}) {
  if (syncState !== 'offline' && syncState !== 'error') return null

  const offline = syncState === 'offline'
  const pending =
    pendingCount > 0
      ? ` ${pendingCount} modification${pendingCount > 1 ? 's' : ''} en attente d’envoi.`
      : ''

  return (
    <div className={`sync-banner ${syncState}`} role={offline ? 'status' : 'alert'}>
      {offline ? <CloudOff size={18} /> : <TriangleAlert size={18} />}
      <span>
        {offline
          ? `Hors ligne : tes données restent consultables et modifiables.${pending}`
          : `La synchronisation a échoué.${pending} Tes données locales sont conservées.`}
      </span>
      <button className="secondary-btn" onClick={onRetry}>
        <RefreshCw size={15} /> Réessayer
      </button>
    </div>
  )
}
