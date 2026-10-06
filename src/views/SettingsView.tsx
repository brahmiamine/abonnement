import { useRef } from 'react'
import {
  Bell,
  BellRing,
  Check,
  Cloud,
  Download,
  LogOut,
  Moon,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import type { Category, Provider, Settings } from '../types'
import { ProviderManager } from '../components/providers/ProviderManager'

export function SettingsView({
  settings,
  email,
  providers,
  categories,
  installAvailable,
  onEnableNotifications,
  onToggleTheme,
  onInstall,
  onExport,
  onImport,
  onSaveProvider,
  onDeleteProvider,
  onSignOut,
  onClearSubscriptions,
}: {
  settings: Settings
  email?: string
  providers: Provider[]
  categories: Category[]
  installAvailable: boolean
  onEnableNotifications: () => Promise<void>
  onToggleTheme: () => void
  onInstall: () => void
  onExport: () => void
  onImport: (file?: File) => Promise<void>
  onSaveProvider: (provider: Provider) => Promise<void>
  onDeleteProvider: (provider: Provider) => Promise<void>
  onSignOut: () => Promise<unknown>
  onClearSubscriptions: () => Promise<void>
}) {
  const importRef = useRef<HTMLInputElement>(null)

  return (
    <section className="settings-view">
      <ProviderManager
        providers={providers}
        categories={categories}
        onSave={onSaveProvider}
        onDelete={onDeleteProvider}
      />

      <div className="settings-card panel">
        <div className="settings-icon"><Bell size={21} /></div>
        <div className="settings-copy">
          <h3>Rappels de renouvellement</h3>
          <p>Affiche une notification quand une échéance approche, selon les délais choisis pour chaque abonnement.</p>
        </div>
        <button
          className={settings.remindersEnabled ? 'secondary-btn success-btn' : 'primary-btn'}
          onClick={() => void onEnableNotifications()}
        >
          {settings.remindersEnabled
            ? <><Check size={17} /> Activés</>
            : <><BellRing size={17} /> Activer</>}
        </button>
      </div>

      <div className="settings-card panel">
        <div className="settings-icon">
          {settings.theme === 'dark' ? <Moon size={21} /> : <Sun size={21} />}
        </div>
        <div className="settings-copy">
          <h3>Apparence</h3>
          <p>Choisis un thème confortable pour ton téléphone et ton ordinateur.</p>
        </div>
        <button className="secondary-btn" onClick={onToggleTheme}>
          {settings.theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>
      </div>

      {installAvailable && (
        <div className="settings-card panel">
          <div className="settings-icon"><Download size={21} /></div>
          <div className="settings-copy">
            <h3>Installer Subly</h3>
            <p>Ajoute l’application à l’écran d’accueil pour l’utiliser comme une vraie application.</p>
          </div>
          <button className="primary-btn" onClick={onInstall}><Download size={17} /> Installer</button>
        </div>
      )}

      <div className="settings-card panel">
        <div className="settings-icon"><Download size={21} /></div>
        <div className="settings-copy">
          <h3>Export / import</h3>
          <p>Les données restent dans Supabase ; tu peux aussi créer une copie JSON portable.</p>
        </div>
        <div className="settings-actions">
          <button className="secondary-btn" onClick={onExport}><Download size={17} /> Exporter</button>
          <button className="secondary-btn" onClick={() => importRef.current?.click()}><Upload size={17} /> Importer</button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json"
            onChange={(event) => void onImport(event.target.files?.[0])}
          />
        </div>
      </div>

      <div className="settings-card panel">
        <div className="settings-icon"><Cloud size={21} /></div>
        <div className="settings-copy">
          <h3>Compte & synchronisation</h3>
          <p>{email} · données sauvegardées dans Supabase.</p>
        </div>
        <button className="secondary-btn" onClick={() => void onSignOut()}>
          <LogOut size={17} /> Déconnexion
        </button>
      </div>

      <div className="settings-card panel danger-zone">
        <div className="settings-icon"><Trash2 size={21} /></div>
        <div className="settings-copy">
          <h3>Effacer les abonnements</h3>
          <p>Supprime définitivement tous tes abonnements de Supabase. Les fournisseurs sont conservés.</p>
        </div>
        <button className="secondary-btn danger-btn" onClick={() => void onClearSubscriptions()}>
          <Trash2 size={17} /> Effacer
        </button>
      </div>
    </section>
  )
}
