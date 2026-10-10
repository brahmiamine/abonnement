import {
  CalendarDays,
  CircleDollarSign,
  Home,
  Settings as SettingsIcon,
  Sparkles,
  WalletCards,
} from 'lucide-react'
import { navTabFor } from '../../domain/navigation'
import type { View } from '../../types'
import { CountUp } from '../common/CountUp'

const ITEMS = [
  { view: 'home', label: 'Vue d’ensemble', Icon: Home },
  { view: 'subscriptions', label: 'Abonnements', Icon: WalletCards },
  { view: 'calendar', label: 'Calendrier', Icon: CalendarDays },
  { view: 'expenses', label: 'Dépenses', Icon: CircleDollarSign },
  { view: 'settings', label: 'Réglages', Icon: SettingsIcon },
] as const

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
  const index = ITEMS.findIndex((item) => item.view === tab)

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
        <span className="sidebar-label">Subly</span>
      </div>

      <nav aria-label="Navigation principale">
        <div
          className="nav-indicator"
          aria-hidden="true"
          style={{ transform: `translateY(${Math.max(index, 0) * 49}px)` }}
        />
        {ITEMS.map(({ view: target, label, Icon }) => (
          <button
            key={target}
            className={tab === target ? 'active' : ''}
            title={label}
            onClick={() => onView(target)}
          >
            <Icon size={19} />
            <span className="sidebar-label">{label}</span>
            {target === 'subscriptions' && (
              <span className="nav-count sidebar-label">{subscriptionCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-card sidebar-label">
        <Sparkles size={18} />
        <strong>
          <CountUp value={monthly} />
        </strong>
        <span>dépenses mensuelles</span>
        <small>
          <CountUp value={annual} /> / an estimé
        </small>
      </div>

      <div className="sidebar-footer sidebar-label">
        <span>
          <i className="pulse-dot" />
          Données privées
        </span>
        <small>Synchronisées avec Supabase</small>
      </div>
    </aside>
  )
}
