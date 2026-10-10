import type { expenseSummary } from '../domain/expenses'
import type { Category } from '../types'
import { cascade } from '../utils/motion'
import { CountUp } from '../components/common/CountUp'

type ExpenseSummary = ReturnType<typeof expenseSummary>

export function ExpensesView({
  summary,
  byCategory,
}: {
  summary: ExpenseSummary
  byCategory: [Category, number][]
}) {
  return (
    <section className="expenses-view">
      <div className="expenses-hero panel rise">
        <div>
          <span className="eyebrow">Dépenses récurrentes</span>
          <h2>
            <CountUp value={summary.monthly} /> <span>/ mois</span>
          </h2>
          <p>
            <CountUp value={summary.annual} /> estimés sur une année avec les abonnements actifs
            actuels.
          </p>
        </div>

        <div className="expense-hero-meta">
          <span>
            <small>Abonnements actifs</small>
            <strong>{summary.activeCount}</strong>
          </span>
          <span>
            <small>Moyenne mensuelle</small>
            <strong>
              <CountUp value={summary.averageMonthly} />
            </strong>
          </span>
        </div>
      </div>

      <div className="expenses-layout">
        <div className="panel rise" style={cascade(0, 0, 100)}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Répartition</span>
              <h2>Par catégorie</h2>
            </div>
          </div>

          {byCategory.length === 0 ? (
            <p className="muted">Ajoute des abonnements pour voir la répartition.</p>
          ) : (
            <div className="category-spend-list">
              {byCategory.map(([category, value], index) => (
                <div
                  className="category-spend rise"
                  style={cascade(index, 60, 150, 20)}
                  key={category}
                >
                  <div>
                    <span>{category}</span>
                    <strong>
                      <CountUp value={value} />
                      <small>/mois</small>
                    </strong>
                  </div>
                  <div className="category-bar">
                    <i
                      style={{
                        width: `${summary.monthly ? (value / summary.monthly) * 100 : 0}%`,
                        animationDelay: `${300 + Math.min(index, 20) * 80}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel insights-panel rise" style={cascade(0, 0, 180)}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Analyse</span>
              <h2>Repères rapides</h2>
            </div>
          </div>
          <div className="insight-item">
            <span>Dépense mensuelle</span>
            <strong>
              <CountUp value={summary.monthly} />
            </strong>
          </div>
          <div className="insight-item">
            <span>Dépense annuelle</span>
            <strong>
              <CountUp value={summary.annual} />
            </strong>
          </div>
          <div className="insight-item">
            <span>Catégorie principale</span>
            <strong>{byCategory[0]?.[0] || '—'}</strong>
          </div>
          <div className="insight-item">
            <span>Abonnement le plus cher</span>
            <strong>{summary.mostExpensive?.name || '—'}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}
