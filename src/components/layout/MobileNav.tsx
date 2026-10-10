import { CircleDollarSign, Home, Plus, Settings as SettingsIcon, WalletCards } from 'lucide-react'
import { navTabFor } from '../../domain/navigation'
import type { View } from '../../types'

const LEFT = [
  { view: 'home', label: 'Accueil', Icon: Home },
  { view: 'subscriptions', label: 'Abonnements', Icon: WalletCards },
] as const

const RIGHT = [
  { view: 'expenses', label: 'Dépenses', Icon: CircleDollarSign },
  { view: 'settings', label: 'Réglages', Icon: SettingsIcon },
] as const

type Item = (typeof LEFT)[number] | (typeof RIGHT)[number]

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

  const item = ({ view: target, label, Icon }: Item) => (
    <button key={target} className={tab === target ? 'active' : ''} onClick={() => onView(target)}>
      <span className="mobile-nav-icon">
        <Icon size={21} />
      </span>
      <span className="mobile-nav-label">{label}</span>
    </button>
  )

  return (
    <nav className="mobile-nav" aria-label="Navigation mobile">
      {LEFT.map(item)}
      <button className="mobile-add" onClick={onAdd} aria-label="Ajouter">
        <Plus size={25} />
      </button>
      {RIGHT.map(item)}
    </nav>
  )
}
