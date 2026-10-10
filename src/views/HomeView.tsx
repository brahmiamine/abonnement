import { BellRing, CalendarClock, ChevronRight, CircleDollarSign, WalletCards } from 'lucide-react'
import type { expenseSummary } from '../domain/expenses'
import { cycleLabel, daysUntil, formatMoney, nextRenewalLabel } from '../domain/subscriptions'
import type { Subscription } from '../types'
import { cascade } from '../utils/motion'
import { CountUp } from '../components/common/CountUp'
import { EmptyState } from '../components/common/EmptyState'
import { ProviderLogo } from '../components/common/ProviderLogo'

type ExpenseSummary = ReturnType<typeof expenseSummary>

export function HomeView({
  summary,
  upcoming,
  onAdd,
  onEdit,
  onSubscriptions,
  onExpenses,
}: {
  summary: ExpenseSummary
  upcoming: Subscription[]
  onAdd: () => void
  onEdit: (subscription: Subscription) => void
  onSubscriptions: () => void
  onExpenses: () => void
}) {
  const next = upcoming[0]
  const renewalsIn30Days = upcoming.filter((item) => daysUntil(item.renewalDate) <= 30).length

  return (
    <>
      <section className="metrics-grid">
        <div className="metric-card accent-card rise" style={cascade(0, 70)}>
          <div className="metric-icon">
            <WalletCards size={20} />
          </div>
          <span>Dépenses mensuelles</span>
          <strong>
            <CountUp value={summary.monthly} />
          </strong>
          <small>
            {summary.activeCount} abonnement{summary.activeCount > 1 ? 's' : ''} actif
            {summary.activeCount > 1 ? 's' : ''}
          </small>
        </div>

        <div className="metric-card rise" style={cascade(1, 70)}>
          <div className="metric-icon">
            <CircleDollarSign size={20} />
          </div>
          <span>Projection annuelle</span>
          <strong>
            <CountUp value={summary.annual} />
          </strong>
          <small>sur la base actuelle</small>
        </div>

        <div className="metric-card rise" style={cascade(2, 70)}>
          <div className="metric-icon">
            <CalendarClock size={20} />
          </div>
          <span>Prochaine échéance</span>
          <strong>{next ? nextRenewalLabel(next.renewalDate) : '—'}</strong>
          <small>{next ? next.name : 'Aucune échéance'}</small>
        </div>

        <div className="metric-card rise" style={cascade(3, 70)}>
          <div className="metric-icon">
            <BellRing size={20} />
          </div>
          <span>Dans les 30 jours</span>
          <strong>
            <CountUp value={renewalsIn30Days} money={false} />
          </strong>
          <small>renouvellement(s)</small>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel upcoming-panel rise" style={cascade(0, 0, 160)}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">À surveiller</span>
              <h2>Prochaines échéances</h2>
            </div>
            <button className="text-btn" onClick={onSubscriptions}>
              Tout voir <ChevronRight size={16} />
            </button>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState onAdd={onAdd} />
          ) : (
            <div className="renewal-list">
              {upcoming.slice(0, 5).map((item, index) => (
                <button
                  key={item.id}
                  className="renewal-item rise"
                  style={cascade(index, 60, 260)}
                  onClick={() => onEdit(item)}
                >
                  <ProviderLogo name={item.name} logo={item.logo} size="sm" />
                  <span className="renewal-name">
                    <strong>{item.name}</strong>
                    <small>{item.category}</small>
                  </span>
                  <span
                    className={`renewal-badge ${daysUntil(item.renewalDate) <= 3 ? 'urgent' : ''}`}
                  >
                    {nextRenewalLabel(item.renewalDate)}
                  </span>
                  <span className="renewal-price">
                    <strong>{formatMoney(item.price)}</strong>
                    <small>/{cycleLabel(item.cycle)}</small>
                  </span>
                  <ChevronRight size={16} className="renewal-chevron" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel expense-panel rise" style={cascade(0, 0, 240)}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Dépenses</span>
              <h2>Vue rapide</h2>
            </div>
            <button className="text-btn" onClick={onExpenses}>
              Analyser <ChevronRight size={16} />
            </button>
          </div>

          <div className="expense-snapshot">
            <div>
              <span>Par mois</span>
              <strong>
                <CountUp value={summary.monthly} />
              </strong>
            </div>
            <div>
              <span>Par an</span>
              <strong>
                <CountUp value={summary.annual} />
              </strong>
            </div>
            <div>
              <span>Moyenne / abonnement</span>
              <strong>
                <CountUp value={summary.averageMonthly} />
              </strong>
            </div>
          </div>

          <div className="expense-highlight">
            <span>Plus grosse dépense</span>
            <strong>{summary.mostExpensive?.name || '—'}</strong>
          </div>
        </div>
      </section>
    </>
  )
}
