import { RefreshCw } from 'lucide-react'

const ROWS = [0, 1, 2, 3]

/** Squelette animé affiché pendant le premier chargement des données Supabase. */
export function LoadingSkeleton() {
  return (
    <div className="skeleton" role="status" aria-label="Synchronisation avec Supabase…">
      <div className="metrics-grid">
        {ROWS.map((row) => (
          <div key={row} className="skeleton-block skeleton-metric" />
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="panel skeleton-list">
          <div className="skeleton-line skeleton-title" />
          {ROWS.map((row) => (
            <div key={row} className="skeleton-row">
              <div className="skeleton-line skeleton-logo" />
              <div className="skeleton-line skeleton-text" />
              <div className="skeleton-line skeleton-pill" />
            </div>
          ))}
        </div>
        <div className="skeleton-block skeleton-side" />
      </div>
      <div className="skeleton-caption">
        <RefreshCw size={14} className="spin" />
        <span>Synchronisation avec Supabase…</span>
      </div>
    </div>
  )
}
