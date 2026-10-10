import { Cloud, CloudOff, Download, Moon, Plus, RefreshCw, Sun } from 'lucide-react'
import type { Settings, SyncState, View } from '../../types'

const titles: Record<View, string> = {
  home: 'Mes abonnements',
  subscriptions: 'Tous les abonnements',
  calendar: 'Calendrier',
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
      <div className="topbar-title">
        <p className="eyebrow">Gestionnaire personnel</p>
        <div className="mobile-brand" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          <span>Subly</span>
        </div>
        <h1 key={view}>{titles[view]}</h1>
      </div>

      <div className="top-actions">
        <span className={`sync-pill ${syncState}`}>
          {syncState === 'syncing' ? (
            <RefreshCw size={14} className="spin" />
          ) : syncState === 'offline' ? (
            <CloudOff size={14} />
          ) : (
            <Cloud size={14} />
          )}
          {syncState === 'syncing'
            ? 'Synchro…'
            : syncState === 'error'
              ? 'Erreur de synchro'
              : syncState === 'offline'
                ? 'Hors ligne'
                : 'Synchronisé'}
        </span>

        {installAvailable && (
          <button className="secondary-btn install-btn" onClick={onInstall}>
            <Download size={17} /> Installer
          </button>
        )}

        <button
          className="icon-btn theme-btn"
          onClick={onToggleTheme}
          aria-label="Changer de thème"
        >
          <span className={`theme-icon ${settings.theme}`}>
            {settings.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </span>
        </button>

        <button className="primary-btn add-btn" onClick={onAdd}>
          <Plus size={18} /> <span>Ajouter</span>
        </button>
      </div>
    </header>
  )
}
