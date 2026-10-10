import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronRight, Plus, RefreshCw, Search, X } from 'lucide-react'
import { isoToday } from '../../config'
import { customLogo } from '../../data/providers'
import { advanceRenewalDate } from '../../domain/subscriptions'
import { useDialog } from '../../hooks/useDialog'
import { useExitAnimation } from '../../hooks/useExitAnimation'
import type {
  BillingCycle,
  Category,
  Provider,
  Subscription,
  SubscriptionDraft,
  SubscriptionStatus,
} from '../../types'
import { ProviderLogo } from '../common/ProviderLogo'

const emptyDraft = (): SubscriptionDraft => ({
  name: '',
  logo: '',
  website: '',
  category: 'Streaming',
  price: 0,
  currency: 'EUR',
  cycle: 'monthly',
  startDate: isoToday(),
  renewalDate: advanceRenewalDate(isoToday(), 'monthly'),
  expirationDate: '',
  status: 'active',
  autoRenew: true,
  remindDays: [7, 3, 1],
  notes: '',
})

export function SubscriptionModal({
  initial,
  providers,
  categories,
  onClose,
  onSave,
}: {
  initial: Subscription | null
  providers: Provider[]
  categories: Category[]
  onClose: () => void
  onSave: (draft: SubscriptionDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<SubscriptionDraft>(() =>
    initial
      ? {
          providerId: initial.providerId,
          name: initial.name,
          logo: initial.logo,
          website: initial.website,
          category: initial.category,
          price: initial.price,
          currency: initial.currency,
          cycle: initial.cycle,
          startDate: initial.startDate,
          renewalDate: initial.renewalDate,
          expirationDate: initial.autoRenew ? '' : initial.expirationDate || initial.renewalDate,
          status: initial.status,
          autoRenew: initial.autoRenew,
          remindDays: initial.remindDays,
          notes: initial.notes || '',
        }
      : emptyDraft(),
  )
  const [providerQuery, setProviderQuery] = useState(initial?.name || '')
  const [showProviders, setShowProviders] = useState(!initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [closing, close] = useExitAnimation(onClose)
  const dialogRef = useDialog<HTMLDivElement>(close)
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`

  useEffect(() => inputRef.current?.focus(), [])

  const matches = useMemo(() => {
    const query = providerQuery.trim().toLowerCase()
    const list = query
      ? providers.filter((provider) =>
          `${provider.name} ${provider.category}`.toLowerCase().includes(query),
        )
      : providers

    return list.slice(0, 10)
  }, [providers, providerQuery])

  const chooseProvider = (provider: Provider) => {
    setDraft((current) => ({
      ...current,
      providerId: provider.id,
      name: provider.name,
      logo: provider.logo,
      website: provider.website,
      category: provider.category,
    }))
    setProviderQuery(provider.name)
    setShowProviders(false)
  }

  const useCustomProvider = () => {
    const name = providerQuery.trim()
    if (!name) return
    setDraft((current) => ({ ...current, providerId: undefined, name }))
    setShowProviders(false)
  }

  const syncBillingDates = (
    current: SubscriptionDraft,
    startDate = current.startDate,
    cycle = current.cycle,
  ): SubscriptionDraft => {
    const renewalDate = advanceRenewalDate(startDate, cycle)
    return {
      ...current,
      startDate,
      cycle,
      renewalDate,
      expirationDate: current.autoRenew ? '' : renewalDate,
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim() || draft.price < 0 || !draft.renewalDate || saving) return

    setSaving(true)
    setError('')
    try {
      const logo = draft.logo || customLogo(draft.website)
      await onSave({ ...draft, name: draft.name.trim(), logo })
      close()
    } catch {
      setError('Impossible d’enregistrer cet abonnement. Réessaie.')
    } finally {
      setSaving(false)
    }
  }

  const hasExactProvider = providers.some(
    (provider) => provider.name.toLowerCase() === providerQuery.trim().toLowerCase(),
  )

  return (
    <div
      className={`modal-backdrop ${closing ? 'is-closing' : ''}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id('title')}
      >
        <div className="modal-header">
          <span className="sheet-handle" aria-hidden="true" />
          <div>
            <span className="eyebrow">{initial ? 'Modification' : 'Nouvel abonnement'}</span>
            <h2 id={id('title')}>{initial ? 'Modifier l’abonnement' : 'Ajouter un abonnement'}</h2>
          </div>
          <button type="button" className="icon-btn close-btn" onClick={close} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="subscription-form">
          <div className="field provider-field">
            <label htmlFor={id('provider')}>Fournisseur</label>
            <div className="search-input">
              <Search size={18} />
              <input
                ref={inputRef}
                id={id('provider')}
                value={providerQuery}
                placeholder="Netflix, Claude, RED by SFR…"
                onFocus={() => setShowProviders(true)}
                onChange={(event) => {
                  const value = event.target.value
                  setProviderQuery(value)
                  setDraft((current) => ({
                    ...current,
                    name: value,
                    providerId: undefined,
                    logo: '',
                  }))
                  setShowProviders(true)
                }}
              />
            </div>

            {showProviders && (
              <div className="provider-results">
                {matches.map((provider) => (
                  <button type="button" key={provider.id} onClick={() => chooseProvider(provider)}>
                    <ProviderLogo name={provider.name} logo={provider.logo} size="sm" />
                    <span>
                      <strong>{provider.name}</strong>
                      <small>{provider.category}</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {providerQuery.trim() && !hasExactProvider && (
                  <button type="button" className="custom-provider" onClick={useCustomProvider}>
                    <span className="custom-provider-plus">
                      <Plus size={16} />
                    </span>
                    <span>
                      <strong>Utiliser “{providerQuery.trim()}”</strong>
                      <small>Fournisseur personnalisé</small>
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor={id('price')}>Prix</label>
              <div className="money-input">
                <input
                  id={id('price')}
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={draft.price || ''}
                  onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })}
                />
                <span>€</span>
              </div>
            </div>

            <div className="field">
              <label htmlFor={id('cycle')}>Facturation</label>
              <select
                id={id('cycle')}
                value={draft.cycle}
                onChange={(event) => {
                  const cycle = event.target.value as BillingCycle
                  setDraft((current) => syncBillingDates(current, current.startDate, cycle))
                }}
              >
                <option value="weekly">Chaque semaine</option>
                <option value="monthly">Chaque mois</option>
                <option value="quarterly">Chaque trimestre</option>
                <option value="yearly">Chaque année</option>
              </select>
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor={id('start')}>Date de début</label>
              <input
                id={id('start')}
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  setDraft((current) =>
                    syncBillingDates(current, event.target.value, current.cycle),
                  )
                }
              />
            </div>

            <div className="field">
              <label htmlFor={id('renewal')}>Prochain renouvellement</label>
              <input
                id={id('renewal')}
                type="date"
                required
                value={draft.renewalDate}
                onChange={(event) => {
                  const renewalDate = event.target.value
                  setDraft((current) => ({
                    ...current,
                    renewalDate,
                    expirationDate: current.autoRenew ? '' : renewalDate,
                  }))
                }}
              />
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor={id('end')}>
                Fin / expiration <span>calculée automatiquement</span>
              </label>
              {draft.autoRenew ? (
                <div id={id('end')} className="computed-date">
                  Sans date de fin · renouvellement automatique
                </div>
              ) : (
                <input
                  id={id('end')}
                  type="date"
                  value={draft.expirationDate || draft.renewalDate}
                  readOnly
                />
              )}
            </div>

            <div className="field">
              <label htmlFor={id('category')}>Catégorie</label>
              <select
                id={id('category')}
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value as Category })
                }
              >
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label htmlFor={id('status')}>Statut</label>
              <select
                id={id('status')}
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value as SubscriptionStatus })
                }
              >
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
                <option value="paused">En pause</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor={id('website')}>
                Site web <span>optionnel</span>
              </label>
              <input
                id={id('website')}
                type="url"
                placeholder="https://…"
                value={draft.website || ''}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    website: event.target.value,
                    logo: draft.providerId ? draft.logo : customLogo(event.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="field" role="group" aria-labelledby={id('remind')}>
            <span className="field-label" id={id('remind')}>
              Me rappeler avant le renouvellement
            </span>
            <div className="reminder-pills">
              {[30, 14, 7, 3, 1, 0].map((day) => {
                const active = draft.remindDays.includes(day)
                return (
                  <button
                    type="button"
                    key={day}
                    className={active ? 'active' : ''}
                    aria-pressed={active}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        remindDays: active
                          ? draft.remindDays.filter((value) => value !== day)
                          : [...draft.remindDays, day].sort((a, b) => b - a),
                      })
                    }
                  >
                    {active && <Check size={14} className="pill-check" />}
                    {day === 0 ? 'Jour J' : `${day} j`}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="switch-row">
            <span>
              <strong>Renouvellement automatique</strong>
              <small>La prochaine échéance avancera automatiquement.</small>
            </span>
            <input
              type="checkbox"
              checked={draft.autoRenew}
              onChange={(event) => {
                const autoRenew = event.target.checked
                setDraft((current) => ({
                  ...current,
                  autoRenew,
                  expirationDate: autoRenew ? '' : current.renewalDate,
                }))
              }}
            />
            <i />
          </label>

          <div className="field">
            <label htmlFor={id('notes')}>
              Note <span>optionnel</span>
            </label>
            <textarea
              id={id('notes')}
              rows={2}
              placeholder="Compte famille, promo, engagement…"
              value={draft.notes || ''}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            />
          </div>

          {error && <div className="auth-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={close}>
              Annuler
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? <RefreshCw size={18} className="spin" /> : <Check size={18} />}
              {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
