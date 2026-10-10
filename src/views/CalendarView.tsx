import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, List } from 'lucide-react'
import { ProviderLogo } from '../components/common/ProviderLogo'
import { buildMonth, isoDate } from '../domain/calendar'
import { cycleLabel, formatDate, formatMoney } from '../domain/subscriptions'
import { isoToday } from '../config'
import type { Subscription } from '../types'
import { cascade } from '../utils/motion'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MAX_LOGOS = 3

const monthLabel = (year: number, monthIndex: number) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
    new Date(year, monthIndex, 1, 12),
  )

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(`${date}T12:00:00`),
  )

/** Calendrier mensuel des dates de paiement, avec le détail du jour choisi. */
export function CalendarView({
  subscriptions,
  onEdit,
  onList,
}: {
  subscriptions: Subscription[]
  onEdit: (subscription: Subscription) => void
  onList: () => void
}) {
  const today = isoToday()
  const [cursor, setCursor] = useState(() => {
    const [year, month] = today.split('-').map(Number)
    return { year, monthIndex: month - 1 }
  })
  const [selected, setSelected] = useState(today)

  const month = useMemo(
    () => buildMonth(subscriptions, cursor.year, cursor.monthIndex),
    [subscriptions, cursor],
  )

  const move = (delta: number) => {
    const next = new Date(cursor.year, cursor.monthIndex + delta, 1, 12)
    setCursor({ year: next.getFullYear(), monthIndex: next.getMonth() })
    setSelected(isoDate(next.getFullYear(), next.getMonth(), 1))
  }

  const goToday = () => {
    const [year, monthIndex] = today.split('-').map(Number)
    setCursor({ year, monthIndex: monthIndex - 1 })
    setSelected(today)
  }

  const selectedDay = month.days.find((day) => day.date === selected)
  const dayItems = selectedDay?.items ?? []
  const label = monthLabel(cursor.year, cursor.monthIndex)

  return (
    <section className="calendar-view">
      <div className="panel calendar-panel rise">
        <div className="calendar-header">
          <div className="calendar-nav">
            <button className="icon-btn" onClick={() => move(-1)} aria-label="Mois précédent">
              <ChevronLeft size={20} />
            </button>
            <h2 aria-live="polite">{label}</h2>
            <button className="icon-btn" onClick={() => move(1)} aria-label="Mois suivant">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="calendar-actions">
            <button className="secondary-btn" onClick={goToday}>
              Aujourd’hui
            </button>
            <button className="secondary-btn" onClick={onList}>
              <List size={16} /> Liste
            </button>
          </div>
        </div>

        <p className="calendar-total">
          <strong>{formatMoney(month.monthTotal)}</strong> à payer en {label} · {month.paymentCount}{' '}
          paiement{month.paymentCount > 1 ? 's' : ''}
        </p>

        <div className="calendar-grid" role="group" aria-label={`Échéances de ${label}`}>
          <div className="calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>

          {month.weeks.map((week) => (
            <div className="calendar-week" key={week[0].date}>
              {week.map((day) => {
                const count = day.items.length
                const description = count
                  ? `${count} paiement${count > 1 ? 's' : ''}, ${formatMoney(day.total)}`
                  : 'aucun paiement'
                return (
                  <div key={day.date}>
                    <button
                      className={[
                        'calendar-day',
                        day.inMonth ? '' : 'outside',
                        day.date === today ? 'today' : '',
                        day.date === selected ? 'selected' : '',
                        count ? 'has-items' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={`${dayLabel(day.date)} : ${description}`}
                      aria-current={day.date === today ? 'date' : undefined}
                      aria-pressed={day.date === selected}
                      onClick={() => setSelected(day.date)}
                    >
                      <span className="calendar-day-number">{day.day}</span>
                      {count > 0 && (
                        <span className="calendar-day-items" aria-hidden="true">
                          {day.items.slice(0, MAX_LOGOS).map((item) => (
                            <ProviderLogo
                              key={item.id}
                              name={item.name}
                              logo={item.logo}
                              size="xs"
                            />
                          ))}
                          {count > MAX_LOGOS && <small>+{count - MAX_LOGOS}</small>}
                        </span>
                      )}
                      {count > 0 && (
                        <span className="calendar-day-total" aria-hidden="true">
                          {formatMoney(day.total)}
                        </span>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="panel calendar-detail rise" style={cascade(1)}>
        <h3>{dayLabel(selected)}</h3>
        {dayItems.length === 0 ? (
          <p className="calendar-empty">Aucun paiement ce jour-là.</p>
        ) : (
          <ul>
            {dayItems.map((item) => (
              <li key={item.id}>
                <ProviderLogo name={item.name} logo={item.logo} />
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {formatMoney(item.price)} / {cycleLabel(item.cycle)}
                    {item.autoRenew ? '' : ` · se termine le ${formatDate(item.renewalDate)}`}
                  </small>
                </div>
                <button className="secondary-btn" onClick={() => onEdit(item)}>
                  Modifier
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
