import { CircleDollarSign, Home, Plus, Settings as SettingsIcon, WalletCards } from 'lucide-react'
import { navTabFor } from '../../domain/navigation'
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
  const tab = navTabFor(view)

  return (
    <nav className="mobile-nav" aria-label="Navigation mobile">
      <button className={tab === 'home' ? 'active' : ''} onClick={() => onView('home')}>
        <Home size={21} /><span>Accueil</span>
      </button>
      <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => onView('subscriptions')}>
        <WalletCards size={21} /><span>Abonnements</span>
      </button>
      <button className="mobile-add" onClick={onAdd}><Plus size={25} /></button>
      <button className={tab === 'expenses' ? 'active' : ''} onClick={() => onView('expenses')}>
        <CircleDollarSign size={21} /><span>Dépenses</span>
      </button>
      <button className={tab === 'settings' ? 'active' : ''} onClick={() => onView('settings')}>
        <SettingsIcon size={21} /><span>Réglages</span>
      </button>
    </nav>
  )
}
