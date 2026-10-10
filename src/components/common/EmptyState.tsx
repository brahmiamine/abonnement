import { Plus, WalletCards } from 'lucide-react'

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <WalletCards size={28} />
      </div>
      <h3>Aucun abonnement pour le moment</h3>
      <p>Ajoute Netflix, Claude, Spotify, ton forfait mobile ou n’importe quel abonnement.</p>
      <button className="primary-btn" onClick={onAdd}>
        <Plus size={18} /> Ajouter un abonnement
      </button>
    </div>
  )
}
