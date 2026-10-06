import { ArrowLeft } from 'lucide-react'
import type { Category, Provider } from '../types'
import { ProviderManager } from '../components/providers/ProviderManager'

export function ProvidersView({
  providers,
  categories,
  onBack,
  onSave,
  onDelete,
}: {
  providers: Provider[]
  categories: Category[]
  onBack: () => void
  onSave: (provider: Provider) => Promise<void>
  onDelete: (provider: Provider) => Promise<void>
}) {
  return (
    <section className="providers-view">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={17} /> Réglages
      </button>
      <ProviderManager
        providers={providers}
        categories={categories}
        onSave={onSave}
        onDelete={onDelete}
      />
    </section>
  )
}
