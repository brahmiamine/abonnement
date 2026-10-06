import { CircleDollarSign, Home, Plus, Settings as SettingsIcon, WalletCards } from 'lucide-react'
import type { View } from '../../types'

export function MobileNav({
  view,
  onView,
  onAdd,
}: {
  view: View
  onView: (view: View) => void
  onAdd: () => void
}) {
  return (
    <nav className="mobile-nav">
      <button className={view === 'home' ? 'active' : ''} onClick={() => onView('home')}>
        <Home size={21} /><span>Accueil</span>
      </button>
      <button className={view === 'subscriptions' ? 'active' : ''} onClick={() => onView('subscriptions')}>
        <WalletCards size={21} /><span>Abonnements</span>
      </button>
      <button className="mobile-add" onClick={onAdd}><Plus size={25} /></button>
      <button className={view === 'expenses' ? 'active' : ''} onClick={() => onView('expenses')}>
        <CircleDollarSign size={21} /><span>Dépenses</span>
      </button>
      <button className={view === 'settings' ? 'active' : ''} onClick={() => onView('settings')}>
        <SettingsIcon size={21} /><span>Réglages</span>
      </button>
    </nav>
  )
}
