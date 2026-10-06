import { memo } from 'react'
import { Edit3, Trash2 } from 'lucide-react'
import { cycleLabel, daysUntil, formatMoney, nextRenewalLabel } from '../../domain/subscriptions'
import type { Subscription } from '../../types'
import { cascade } from '../../utils/motion'
import { ProviderLogo } from '../common/ProviderLogo'

export const SubscriptionCard = memo(function SubscriptionCard({
  item,
  index = 0,
  onEdit,
  onDelete,
}: {
  item: Subscription
  index?: number
  onEdit: () => void
  onDelete: () => void
}) {
  const days = daysUntil(item.renewalDate)
  const urgency = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : days <= 14 ? 'soon' : ''

  return (
    <article className="subscription-card rise" style={cascade(index)}>
      <div className="sub-top">
        <ProviderLogo name={item.name} logo={item.logo} />
        <div className="sub-main">
          <div className="sub-name-row">
            <h3>{item.name}</h3>
            {item.status === 'trial' && <span className="status-chip trial">Essai</span>}
            {item.status === 'paused' && <span className="status-chip paused">Pause</span>}
            {item.autoRenew && <span className="status-chip auto">Auto</span>}
          </div>
          <span className="category-label">{item.category}</span>
        </div>
        <div className="sub-actions">
          <button className="icon-btn tiny" onClick={onEdit} aria-label="Modifier"><Edit3 size={16} /></button>
          <button className="icon-btn tiny danger" onClick={onDelete} aria-label="Supprimer"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="sub-cost">
        <strong>{formatMoney(item.price)}</strong>
        <span>/{cycleLabel(item.cycle)}</span>
      </div>

      <div className="sub-renewal">
        <span>Prochaine échéance</span>
        <strong className={urgency}>{nextRenewalLabel(item.renewalDate)}</strong>
      </div>
    </article>
  )
})
