import { Cloud, Download, Moon, Plus, RefreshCw, Sun } from 'lucide-react'
import type { Settings, SyncState, View } from '../../types'

const titles: Record<View, string> = {
  home: 'Mes abonnements',
  subscriptions: 'Tous les abonnements',
  expenses: 'Dépenses',
  settings: 'Réglages',
  providers: 'Fournisseurs',
}

export function Topbar({
  view,
  syncState,
  settings,
  installAvailable,
  onInstall,
  onToggleTheme,
  onAdd,
}: {
  view: View
  syncState: SyncState
  settings: Settings
  installAvailable: boolean
  onInstall: () => void
  onToggleTheme: () => void
  onAdd: () => void
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Gestionnaire personnel</p>
        <h1>{titles[view]}</h1>
      </div>

      <div className="top-actions">
        <span className={`sync-pill ${syncState}`}>
          {syncState === 'syncing'
            ? <RefreshCw size={14} className="spin" />
            : <Cloud size={14} />}
          {syncState === 'syncing'
            ? 'Synchro…'
            : syncState === 'error'
              ? 'Erreur de synchro'
              : 'Synchronisé'}
        </span>

        {installAvailable && (
          <button className="secondary-btn install-btn" onClick={onInstall}>
            <Download size={17} /> Installer
          </button>
        )}

        <button className="icon-btn theme-btn" onClick={onToggleTheme} aria-label="Changer de thème">
          {settings.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <button className="primary-btn add-btn" onClick={onAdd}>
          <Plus size={18} /> <span>Ajouter</span>
        </button>
      </div>
    </header>
  )
}
