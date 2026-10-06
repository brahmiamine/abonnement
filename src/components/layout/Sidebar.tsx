import { CircleDollarSign, Home, Settings as SettingsIcon, Sparkles, WalletCards } from 'lucide-react'
import { formatMoney } from '../../domain/subscriptions'
import { navTabFor } from '../../domain/navigation'
import type { View } from '../../types'

export function Sidebar({
  view,
  subscriptionCount,
  monthly,
  annual,
  onView,
}: {
  view: View
  subscriptionCount: number
  monthly: number
  annual: number
  onView: (view: View) => void
}) {
  const tab = navTabFor(view)

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/abonnement/icon.svg" alt="" />
        <span>Subly</span>
      </div>

      <nav aria-label="Navigation principale">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => onView('home')}>
          <Home size={19} /> Vue d’ensemble
        </button>
        <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => onView('subscriptions')}>
          <WalletCards size={19} /> Abonnements <span className="nav-count">{subscriptionCount}</span>
        </button>
        <button className={tab === 'expenses' ? 'active' : ''} onClick={() => onView('expenses')}>
          <CircleDollarSign size={19} /> Dépenses
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => onView('settings')}>
          <SettingsIcon size={19} /> Réglages
        </button>
      </nav>

      <div className="sidebar-card">
        <Sparkles size={18} />
        <strong>{formatMoney(monthly)}</strong>
        <span>dépenses mensuelles</span>
        <small>{formatMoney(annual)} / an estimé</small>
      </div>

      <div className="sidebar-footer">
        <span>Données privées</span>
        <small>Synchronisées avec Supabase</small>
      </div>
    </aside>
  )
}
