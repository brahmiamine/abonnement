import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { daysUntil, toMonthly } from '../domain/subscriptions'
import type { Subscription, SubscriptionFilter } from '../types'
import { EmptyState } from '../components/common/EmptyState'
import { SubscriptionCard } from '../components/subscriptions/SubscriptionCard'

export function SubscriptionsView({
  subscriptions,
  onAdd,
  onEdit,
  onDelete,
}: {
  subscriptions: Subscription[]
  onAdd: () => void
  onEdit: (subscription: Subscription) => void
  onDelete: (subscription: Subscription) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SubscriptionFilter>('all')

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    let list = subscriptions.filter(
      (item) => !value || `${item.name} ${item.category}`.toLowerCase().includes(value),
    )

    if (filter === 'soon') {
      list = list.filter((item) => {
        const days = daysUntil(item.renewalDate)
        return days >= 0 && days <= 30
      })
    }
    if (filter === 'trial') list = list.filter((item) => item.status === 'trial')
    if (filter === 'expensive') {
      return [...list].sort(
        (a, b) => toMonthly(b.price, b.cycle) - toMonthly(a.price, a.cycle),
      )
    }

    return [...list].sort(
      (a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate),
    )
  }, [subscriptions, query, filter])

  return (
    <section className="subscriptions-view">
      <div className="toolbar">
        <div className="search-input wide">
          <Search size={18} />
          <input
            placeholder="Rechercher un abonnement…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="filter-row">
          <SlidersHorizontal size={17} />
          {([
            ['all', 'Tous'],
            ['soon', '≤ 30 jours'],
            ['trial', 'Essais'],
            ['expensive', 'Plus chers'],
          ] as [SubscriptionFilter, string][]).map(([value, label]) => (
            <button
              className={filter === value ? 'active' : ''}
              key={value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState onAdd={onAdd} />
      ) : (
        <div className="subscriptions-grid">
          {filtered.map((item) => (
            <SubscriptionCard
              key={item.id}
              item={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
