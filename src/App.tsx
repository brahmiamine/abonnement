import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { AuthScreen } from './components/auth/AuthScreen'
import { ResetPasswordScreen } from './components/auth/ResetPasswordScreen'
import { MobileNav } from './components/layout/MobileNav'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { SubscriptionModal } from './components/subscriptions/SubscriptionModal'
import { createBackup, parseBackup, serializeBackup } from './domain/backup'
import { expenseSummary, expensesByCategory } from './domain/expenses'
import { daysUntil } from './domain/subscriptions'
import { useAppData } from './hooks/useAppData'
import { useHashView } from './hooks/useHashView'
import { useAuth } from './hooks/useAuth'
import { useNotifications } from './hooks/useNotifications'
import { usePwaInstall } from './hooks/usePwaInstall'
import type { Provider, Subscription, SubscriptionDraft } from './types'
import { downloadJson } from './utils/backup'
import { isoToday } from './config'
import { ExpensesView } from './views/ExpensesView'
import { HomeView } from './views/HomeView'
import { ProvidersView } from './views/ProvidersView'
import { SettingsView } from './views/SettingsView'
import { SubscriptionsView } from './views/SubscriptionsView'

function App() {
  const auth = useAuth()
  const data = useAppData(auth.session)
  const pwa = usePwaInstall()
  const [view, setView] = useHashView()
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useNotifications(data.subscriptions, data.settings.remindersEnabled)

  const summary = useMemo(
    () => expenseSummary(data.subscriptions),
    [data.subscriptions],
  )

  const byCategory = useMemo(
    () => expensesByCategory(data.subscriptions),
    [data.subscriptions],
  )

  const upcoming = useMemo(
    () =>
      data.subscriptions
        .filter((item) => item.status !== 'paused' && daysUntil(item.renewalDate) >= 0)
        .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate)),
    [data.subscriptions],
  )

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (subscription: Subscription) => {
    setEditing(subscription)
    setModalOpen(true)
  }

  const saveSubscription = async (draft: SubscriptionDraft) => {
    await data.saveSubscription(draft, editing)
    setModalOpen(false)
    setEditing(null)
  }

  const deleteSubscription = async (subscription: Subscription) => {
    if (!window.confirm(`Supprimer l’abonnement ${subscription.name} ?`)) return
    try {
      await data.deleteSubscription(subscription.id)
    } catch {
      window.alert('Impossible de supprimer cet abonnement.')
    }
  }

  const deleteProvider = async (provider: Provider) => {
    const used = data.subscriptions.some((item) => item.providerId === provider.id)
    const message = used
      ? `${provider.name} est utilisé par au moins un abonnement. Le fournisseur sera retiré du catalogue, mais les abonnements existants seront conservés. Continuer ?`
      : `Supprimer le fournisseur ${provider.name} ?`

    if (!window.confirm(message)) return

    try {
      await data.deleteProvider(provider.id)
    } catch {
      window.alert('Impossible de supprimer ce fournisseur.')
    }
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) return

    const permission = await Notification.requestPermission()
    data.setSettings((current) => ({
      ...current,
      remindersEnabled: permission === 'granted',
    }))
  }

  const toggleTheme = () => {
    data.setSettings((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark',
    }))
  }

  const exportData = () => {
    const payload = createBackup(data.subscriptions, data.providers, data.settings)
    downloadJson(
      serializeBackup(payload),
      `subly-backup-${isoToday()}.json`,
    )
  }

  const importData = async (file?: File) => {
    if (!file) return

    try {
      const payload = parseBackup(await file.text())
      await data.importBackup(payload)
      window.alert('Import terminé.')
    } catch {
      window.alert('Ce fichier ne semble pas être une sauvegarde Subly valide.')
    }
  }

  const clearSubscriptions = async () => {
    if (!window.confirm('Supprimer définitivement tous les abonnements ?')) return

    try {
      await data.clearSubscriptions()
    } catch {
      window.alert('Impossible de supprimer les abonnements.')
    }
  }

  if (!auth.authReady) {
    return (
      <div className="auth-loading">
        <RefreshCw size={28} className="spin" />
        <span>Ouverture de Subly…</span>
      </div>
    )
  }

  if (!auth.session) return <AuthScreen />

  if (auth.passwordRecovery) {
    return <ResetPasswordScreen onComplete={auth.completePasswordRecovery} />
  }

  if (!data.dataReady) {
    return (
      <div className="auth-loading">
        <RefreshCw size={28} className="spin" />
        <span>Synchronisation avec Supabase…</span>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        subscriptionCount={data.subscriptions.length}
        monthly={summary.monthly}
        annual={summary.annual}
        onView={setView}
      />

      <main className="main-content">
        <Topbar
          view={view}
          syncState={data.syncState}
          settings={data.settings}
          installAvailable={pwa.installAvailable}
          onInstall={() => void pwa.install()}
          onToggleTheme={toggleTheme}
          onAdd={openAdd}
        />

        {view === 'home' && (
          <HomeView
            summary={summary}
            upcoming={upcoming}
            onAdd={openAdd}
            onEdit={openEdit}
            onSubscriptions={() => setView('subscriptions')}
            onExpenses={() => setView('expenses')}
          />
        )}

        {view === 'subscriptions' && (
          <SubscriptionsView
            subscriptions={data.subscriptions}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={(subscription) => void deleteSubscription(subscription)}
          />
        )}

        {view === 'expenses' && (
          <ExpensesView summary={summary} byCategory={byCategory} />
        )}

        {view === 'settings' && (
          <SettingsView
            settings={data.settings}
            email={auth.session.user.email}
            providerCount={data.providers.length}
            installAvailable={pwa.installAvailable}
            onEnableNotifications={requestNotifications}
            onToggleTheme={toggleTheme}
            onInstall={() => void pwa.install()}
            onExport={exportData}
            onImport={importData}
            onOpenProviders={() => setView('providers')}
            onSignOut={auth.signOut}
            onClearSubscriptions={clearSubscriptions}
          />
        )}

        {view === 'providers' && (
          <ProvidersView
            providers={data.providers}
            categories={data.categories}
            onBack={() => setView('settings')}
            onSave={data.saveProvider}
            onDelete={deleteProvider}
          />
        )}
      </main>

      <MobileNav view={view} onView={setView} onAdd={openAdd} />

      {modalOpen && (
        <SubscriptionModal
          initial={editing}
          providers={data.providers}
          categories={data.categories}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSave={saveSubscription}
        />
      )}
    </div>
  )
}

export default App
