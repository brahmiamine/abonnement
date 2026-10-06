import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  Bell,
  BellRing,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  Cloud,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserPlus,
  WalletCards,
  X,
} from 'lucide-react'
import { customLogo } from './data/providers'
import { supabase } from './lib/supabase'
import {
  loadSubscriptions,
  loadUserSettings,
  removeAllSubscriptions,
  removeSubscription,
  saveUserSettings,
  upsertSubscription,
  upsertSubscriptions,
} from './lib/subscriptionsDb'
import {
  deleteProvider as deleteProviderFromDb,
  ensureProviders,
  loadCategories,
  saveProvider as saveProviderToDb,
} from './lib/providersDb'
import type {
  BillingCycle,
  Category,
  Provider,
  Settings,
  Subscription,
  SubscriptionStatus,
} from './types'
import {
  advanceRenewalDate,
  cycleLabel,
  daysUntil,
  formatDate,
  formatMoney,
  nextRenewalLabel,
  rollAutoRenewalForward,
  subscriptionMonthlyTotal,
  toAnnual,
  toMonthly,
} from './utils/subscriptions'

type View = 'home' | 'subscriptions' | 'budget' | 'settings'
type Filter = 'all' | 'soon' | 'trial' | 'expensive'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const NOTIFIED_KEY = 'subly-notified-v1'

const defaultSettings: Settings = {
  monthlyBudget: 100,
  theme: 'dark',
  remindersEnabled: false,
}

const isoToday = () => new Date().toISOString().slice(0, 10)

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const providerInitials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function ProviderLogo({
  name,
  logo,
  size = 'md',
}: {
  name: string
  logo?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const [failed, setFailed] = useState(!logo)
  useEffect(() => setFailed(!logo), [logo])

  return (
    <span className={`provider-logo provider-logo--${size}`} aria-hidden="true">
      {!failed && logo ? (
        <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{providerInitials(name)}</span>
      )}
    </span>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><WalletCards size={28} /></div>
      <h3>Aucun abonnement pour le moment</h3>
      <p>Ajoute Netflix, Claude, Spotify, ton forfait mobile ou n’importe quel abonnement.</p>
      <button className="primary-btn" onClick={onAdd}><Plus size={18} /> Ajouter un abonnement</button>
    </div>
  )
}

type Draft = Omit<Subscription, 'id' | 'createdAt'>

const emptyDraft = (): Draft => ({
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

function SubscriptionModal({
  initial,
  providers,
  categories,
  onClose,
  onSave,
}: {
  initial?: Subscription | null
  providers: Provider[]
  categories: Category[]
  onClose: () => void
  onSave: (draft: Draft) => void
}) {
  const [draft, setDraft] = useState<Draft>(() =>
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
          expirationDate: initial.autoRenew ? '' : (initial.expirationDate || initial.renewalDate),
          status: initial.status,
          autoRenew: initial.autoRenew,
          remindDays: initial.remindDays,
          notes: initial.notes || '',
        }
      : emptyDraft(),
  )
  const [providerQuery, setProviderQuery] = useState(initial?.name || '')
  const [showProviders, setShowProviders] = useState(!initial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const matches = useMemo(() => {
    const q = providerQuery.trim().toLowerCase()
    if (!q) return providers.slice(0, 10)
    return providers
      .filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q))
      .slice(0, 10)
  }, [providerQuery])

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
    current: Draft,
    startDate = current.startDate,
    cycle = current.cycle,
    autoRenew = current.autoRenew,
  ): Draft => {
    const renewalDate = advanceRenewalDate(startDate, cycle)
    return {
      ...current,
      startDate,
      cycle,
      autoRenew,
      renewalDate,
      expirationDate: autoRenew ? '' : renewalDate,
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim() || draft.price < 0 || !draft.renewalDate) return
    const logo = draft.logo || customLogo(draft.website)
    onSave({ ...draft, name: draft.name.trim(), logo })
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Abonnement" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{initial ? 'Modification' : 'Nouvel abonnement'}</span>
            <h2>{initial ? 'Modifier l’abonnement' : 'Ajouter un abonnement'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        </div>

        <form onSubmit={submit} className="subscription-form">
          <div className="field provider-field">
            <label>Fournisseur</label>
            <div className="search-input">
              <Search size={18} />
              <input
                ref={inputRef}
                value={providerQuery}
                placeholder="Netflix, Claude, Spotify…"
                onFocus={() => setShowProviders(true)}
                onChange={(e) => {
                  const value = e.target.value
                  setProviderQuery(value)
                  setDraft((current) => ({ ...current, name: value, providerId: undefined, logo: '' }))
                  setShowProviders(true)
                }}
              />
            </div>
            {showProviders && (
              <div className="provider-results">
                {matches.map((provider) => (
                  <button type="button" key={provider.id} onClick={() => chooseProvider(provider)}>
                    <ProviderLogo name={provider.name} logo={provider.logo} size="sm" />
                    <span><strong>{provider.name}</strong><small>{provider.category}</small></span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                {providerQuery.trim() && !providers.some((p) => p.name.toLowerCase() === providerQuery.trim().toLowerCase()) && (
                  <button type="button" className="custom-provider" onClick={useCustomProvider}>
                    <span className="custom-provider-plus"><Plus size={16} /></span>
                    <span><strong>Utiliser “{providerQuery.trim()}”</strong><small>Fournisseur personnalisé</small></span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="form-grid two">
            <div className="field">
              <label>Prix</label>
              <div className="money-input"><input type="number" min="0" step="0.01" required value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /><span>€</span></div>
            </div>
            <div className="field">
              <label>Facturation</label>
              <select
                value={draft.cycle}
                onChange={(e) => {
                  const cycle = e.target.value as BillingCycle
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
              <label>Date de début</label>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft((current) => syncBillingDates(current, e.target.value, current.cycle))}
              />
            </div>
            <div className="field">
              <label>Prochain renouvellement</label>
              <input
                type="date"
                required
                value={draft.renewalDate}
                onChange={(e) => {
                  const renewalDate = e.target.value
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
              <label>Fin / expiration <span>calculée automatiquement</span></label>
              {draft.autoRenew ? (
                <div className="computed-date">Sans date de fin · renouvellement automatique</div>
              ) : (
                <input type="date" value={draft.expirationDate || draft.renewalDate} readOnly />
              )}
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
                {categories.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid two">
            <div className="field">
              <label>Statut</label>
              <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as SubscriptionStatus })}>
                <option value="active">Actif</option>
                <option value="trial">Essai</option>
                <option value="paused">En pause</option>
              </select>
            </div>
            <div className="field">
              <label>Site web <span>optionnel</span></label>
              <input type="url" placeholder="https://…" value={draft.website || ''} onChange={(e) => setDraft({ ...draft, website: e.target.value, logo: draft.providerId ? draft.logo : customLogo(e.target.value) })} />
            </div>
          </div>

          <div className="field">
            <label>Me rappeler avant le renouvellement</label>
            <div className="reminder-pills">
              {[30, 14, 7, 3, 1, 0].map((day) => {
                const active = draft.remindDays.includes(day)
                return (
                  <button
                    type="button"
                    key={day}
                    className={active ? 'active' : ''}
                    onClick={() => setDraft({
                      ...draft,
                      remindDays: active ? draft.remindDays.filter((value) => value !== day) : [...draft.remindDays, day].sort((a, b) => b - a),
                    })}
                  >
                    {active && <Check size={14} />}{day === 0 ? 'Jour J' : `${day} j`}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="switch-row">
            <span><strong>Renouvellement automatique</strong><small>Pris en compte dans les prévisions du budget</small></span>
            <input
              type="checkbox"
              checked={draft.autoRenew}
              onChange={(e) => {
                const autoRenew = e.target.checked
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
            <label>Note <span>optionnel</span></label>
            <textarea rows={2} placeholder="Compte famille, promo, engagement…" value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="primary-btn"><Check size={18} /> {initial ? 'Enregistrer' : 'Ajouter'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SubscriptionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Subscription
  onEdit: () => void
  onDelete: () => void
}) {
  const days = daysUntil(item.renewalDate)
  const urgency = days < 0 ? 'overdue' : days <= 3 ? 'urgent' : days <= 14 ? 'soon' : ''

  return (
    <article className="subscription-card">
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
      <div className="sub-price">
        <strong>{formatMoney(item.price)}</strong><span>/ {cycleLabel(item.cycle)}</span>
      </div>
      <div className={`renewal-row ${urgency}`}>
        <CalendarClock size={16} />
        <div><span>{nextRenewalLabel(item.renewalDate)}</span><small>{formatDate(item.renewalDate)}</small></div>
      </div>
    </article>
  )
}



function ProviderManager({
  providers,
  categories,
  onSave,
  onDelete,
}: {
  providers: Provider[]
  categories: Category[]
  onSave: (provider: Provider) => Promise<void>
  onDelete: (provider: Provider) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Provider | null>(null)
  const [draft, setDraft] = useState<Provider | null>(null)
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return providers.filter((provider) =>
      !q || `${provider.name} ${provider.category}`.toLowerCase().includes(q),
    )
  }, [providers, query])

  const openNew = () => {
    const category = categories[0] || ('Autre' as Category)
    setEditing(null)
    setDraft({
      id: `custom-${uid()}`,
      name: '',
      category,
      logo: '',
      website: '',
      color: '#111827',
    })
  }

  const openEdit = (provider: Provider) => {
    setEditing(provider)
    setDraft({ ...provider })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft?.name.trim()) return
    setSaving(true)
    try {
      const logo = draft.logo.trim() || customLogo(draft.website)
      await onSave({ ...draft, name: draft.name.trim(), logo })
      setDraft(null)
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="providers-panel panel">
      <div className="panel-header provider-manager-header">
        <div>
          <span className="eyebrow">Catalogue Supabase</span>
          <h2>Fournisseurs</h2>
          <p>Ajoute, modifie ou supprime les fournisseurs et leurs logos.</p>
        </div>
        <button className="primary-btn" onClick={openNew}><Plus size={17} /> Ajouter</button>
      </div>

      <div className="search-input wide provider-search">
        <Search size={18} />
        <input
          placeholder="Rechercher un fournisseur…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="provider-admin-list">
        {filtered.map((provider) => (
          <div className="provider-admin-row" key={provider.id}>
            <ProviderLogo name={provider.name} logo={provider.logo} size="sm" />
            <div className="provider-admin-copy">
              <strong>{provider.name}</strong>
              <span>{provider.category}{provider.website ? ` · ${provider.website.replace(/^https?:\/\//, '').split('/')[0]}` : ''}</span>
            </div>
            <button className="icon-btn tiny" onClick={() => openEdit(provider)} aria-label={`Modifier ${provider.name}`}>
              <Edit3 size={16} />
            </button>
            <button
              className="icon-btn tiny danger"
              onClick={() => onDelete(provider)}
              aria-label={`Supprimer ${provider.name}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="muted provider-empty">Aucun fournisseur trouvé.</p>}
      </div>

      {draft && (
        <div className="provider-editor-backdrop" role="presentation" onMouseDown={() => setDraft(null)}>
          <form className="provider-editor modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">{editing ? 'Modification' : 'Nouveau fournisseur'}</span>
                <h2>{editing ? editing.name : 'Ajouter un fournisseur'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setDraft(null)}><X size={20} /></button>
            </div>

            <div className="provider-preview-card">
              <ProviderLogo name={draft.name || 'Nouveau'} logo={draft.logo || customLogo(draft.website)} size="lg" />
              <div>
                <strong>{draft.name || 'Nom du fournisseur'}</strong>
                <span>{draft.category}</span>
              </div>
            </div>

            <div className="field">
              <label>Nom</label>
              <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex. RED by SFR Mobile" />
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })}>
                {categories.map((category) => <option value={category} key={category}>{category}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Site web <span>optionnel</span></label>
              <input type="url" value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} placeholder="https://…" />
            </div>
            <div className="field">
              <label>URL du logo <span>optionnel</span></label>
              <input
                type="url"
                value={draft.logo}
                onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
                placeholder="https://…/logo.png"
              />
              <small className="field-help">Si vide, Subly essaie d’utiliser automatiquement l’icône du site web.</small>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setDraft(null)}>Annuler</button>
              <button className="primary-btn" disabled={saving}>
                {saving ? <RefreshCw size={17} className="spin" /> : <Check size={17} />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

const APP_URL = 'https://brahmiamine.github.io/abonnement/'

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
      } else if (mode === 'forgot') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: APP_URL,
        })
        if (authError) throw authError
        setError('Lien envoyé. Consulte ton e-mail puis ouvre le lien pour choisir un nouveau mot de passe.')
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: APP_URL },
        })
        if (authError) throw authError
        if (!data.session) {
          setError('Compte créé. Vérifie ton e-mail pour confirmer ton inscription, puis reconnecte-toi.')
        }
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <img src="/abonnement/icon.svg" alt="" />
          <span>Subly</span>
        </div>
        <span className="eyebrow">Tes abonnements, partout avec toi</span>
        <h1>{mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer mon compte' : 'Mot de passe oublié'}</h1>
        <p className="auth-copy">
          {mode === 'forgot'
            ? 'Indique ton adresse e-mail. Nous t’enverrons un lien sécurisé pour définir un nouveau mot de passe.'
            : 'Tes données sont synchronisées dans Supabase et protégées par ton compte.'}
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Adresse e-mail</label>
            <div className="auth-input"><Mail size={18} /><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@email.com" /></div>
          </div>
          {mode !== 'forgot' && (
            <div className="field">
              <div className="field-label-row">
                <label>Mot de passe</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="forgot-link"
                    onClick={() => { setMode('forgot'); setPassword(''); setShowPassword(false); setError('') }}
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="auth-input password-input">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 caractères minimum"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}
          {error && <div className="auth-message">{error}</div>}
          <button className="primary-btn auth-submit" disabled={loading}>
            {loading ? <RefreshCw size={18} className="spin" /> : mode === 'login' ? <LockKeyhole size={18} /> : mode === 'signup' ? <UserPlus size={18} /> : <Mail size={18} />}
            {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer le compte' : 'Envoyer le lien'}
          </button>
        </form>
        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setPassword('')
            setShowPassword(false)
            setError('')
          }}
        >
          {mode === 'login'
            ? 'Pas encore de compte ? Créer un compte'
            : mode === 'signup'
              ? 'Déjà un compte ? Se connecter'
              : '← Retour à la connexion'}
        </button>
      </div>
    </div>
  )
}

function ResetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmation) {
      setMessage('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      window.history.replaceState({}, document.title, '/abonnement/')
      onComplete()
    } catch (value) {
      setMessage(value instanceof Error ? value.message : 'Impossible de modifier le mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand auth-brand">
          <img src="/abonnement/icon.svg" alt="" />
          <span>Subly</span>
        </div>
        <span className="eyebrow">Sécurité du compte</span>
        <h1>Nouveau mot de passe</h1>
        <p className="auth-copy">Choisis un nouveau mot de passe pour terminer la récupération de ton compte.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Nouveau mot de passe</label>
            <div className="auth-input password-input">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="field">
            <label>Confirmer le mot de passe</label>
            <div className="auth-input password-input">
              <LockKeyhole size={18} />
              <input
                type={showConfirmation ? 'text' : 'password'}
                minLength={6}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Répète le mot de passe"
              />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {message && <div className="auth-message">{message}</div>}
          <button className="primary-btn auth-submit" disabled={loading}>
            {loading ? <RefreshCw size={18} className="spin" /> : <Check size={18} />}
            {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}


function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [providerCatalog, setProviderCatalog] = useState<Provider[]>([])
  const [categoryCatalog, setCategoryCatalog] = useState<Category[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [remoteReady, setRemoteReady] = useState(false)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [view, setView] = useState<View>('home')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const importRef = useRef<HTMLInputElement>(null)


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (!nextSession) {
        setRemoteReady(false)
        if (event === 'SIGNED_OUT') {
          setSubscriptions([])
          setProviderCatalog([])
          setCategoryCatalog([])
        }
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let cancelled = false

    const syncFromSupabase = async () => {
      setSyncState('syncing')
      try {
        const [remoteItems, remoteSettings, remoteProviders, remoteCategories] = await Promise.all([
          loadSubscriptions(),
          loadUserSettings(),
          ensureProviders(session.user.id),
          loadCategories(),
        ])
        if (cancelled) return

        setProviderCatalog(remoteProviders)
        setCategoryCatalog(remoteCategories)

        const source = remoteItems
        const normalized = source.map(rollAutoRenewalForward)
        setSubscriptions(normalized)

        const changedRenewals = normalized.filter((item, index) => item.renewalDate !== source[index]?.renewalDate)
        if (changedRenewals.length) await upsertSubscriptions(changedRenewals, session.user.id)

        if (remoteSettings) {
          setSettings((current) => ({ ...current, ...remoteSettings }))
        } else {
          await saveUserSettings(defaultSettings, session.user.id)
        }

        setRemoteReady(true)
        setSyncState('idle')
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setRemoteReady(true)
          setSyncState('error')
        }
      }
    }

    syncFromSupabase()
    return () => { cancelled = true }
  }, [session?.user.id])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'dark' ? '#0b1020' : '#f5f7fb')
  }, [settings])

  useEffect(() => {
    if (!session || !remoteReady) return
    const timer = window.setTimeout(async () => {
      try {
        setSyncState('syncing')
        await saveUserSettings(settings, session.user.id)
        setSyncState('idle')
      } catch (error) {
        console.error(error)
        setSyncState('error')
      }
    }, 450)
    return () => window.clearTimeout(timer)
  }, [settings, session?.user.id, remoteReady])

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handleInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleInstall)
  }, [])

  useEffect(() => {
    const check = async () => {
      if (!settings.remindersEnabled || !('Notification' in window) || Notification.permission !== 'granted') return
      const sent: Record<string, string> = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}')
      const today = isoToday()
      for (const item of subscriptions) {
        if (item.status === 'paused') continue
        const days = daysUntil(item.renewalDate)
        if (!item.remindDays.includes(days)) continue
        const key = `${item.id}:${item.renewalDate}:${days}`
        if (sent[key] === today) continue
        const title = days === 0 ? `${item.name} se renouvelle aujourd’hui` : `${item.name} : renouvellement dans ${days} j`
        const body = `${formatMoney(item.price)} · ${formatDate(item.renewalDate)}`
        try {
          const registration = await navigator.serviceWorker?.ready
          if (registration) await registration.showNotification(title, { body, icon: '/abonnement/icon.svg', badge: '/abonnement/icon.svg', tag: key })
          else new Notification(title, { body, icon: '/abonnement/icon.svg', tag: key })
          sent[key] = today
        } catch {
          // Notification support differs between browsers; no blocking error is needed.
        }
      }
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(sent))
    }
    check()
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [subscriptions, settings.remindersEnabled])

  const monthly = useMemo(() => subscriptionMonthlyTotal(subscriptions), [subscriptions])
  const annual = useMemo(() => subscriptions.filter((s) => s.status !== 'paused').reduce((sum, item) => sum + toAnnual(item.price, item.cycle), 0), [subscriptions])
  const activeCount = subscriptions.filter((item) => item.status !== 'paused').length
  const upcoming = useMemo(() =>
    subscriptions
      .filter((item) => item.status !== 'paused' && daysUntil(item.renewalDate) >= 0)
      .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate)),
  [subscriptions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = subscriptions.filter((item) => !q || `${item.name} ${item.category}`.toLowerCase().includes(q))
    if (filter === 'soon') list = list.filter((item) => daysUntil(item.renewalDate) >= 0 && daysUntil(item.renewalDate) <= 30)
    if (filter === 'trial') list = list.filter((item) => item.status === 'trial')
    if (filter === 'expensive') list = [...list].sort((a, b) => toMonthly(b.price, b.cycle) - toMonthly(a.price, a.cycle))
    else list = [...list].sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate))
    return list
  }, [subscriptions, query, filter])

  const categoriesSpend = useMemo(() => {
    const map = new Map<string, number>()
    subscriptions.filter((s) => s.status !== 'paused').forEach((item) => {
      map.set(item.category, (map.get(item.category) || 0) + toMonthly(item.price, item.cycle))
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [subscriptions])

  const saveSubscription = async (draft: Draft) => {
    if (!session) return
    let normalizedDraft = draft

    if (!draft.providerId) {
      const provider: Provider = {
        id: `custom-${uid()}`,
        name: draft.name,
        category: draft.category,
        logo: draft.logo || customLogo(draft.website),
        website: draft.website || '',
        color: '#111827',
      }
      await saveProviderToDb(provider, session.user.id)
      setProviderCatalog((items) => [...items, provider].sort((a, b) => a.name.localeCompare(b.name, 'fr')))
      normalizedDraft = { ...draft, providerId: provider.id, logo: provider.logo }
    }

    const item: Subscription = editing
      ? { ...editing, ...normalizedDraft }
      : { ...normalizedDraft, id: uid(), createdAt: new Date().toISOString() }

    setSubscriptions((items) => editing
      ? items.map((current) => current.id === editing.id ? item : current)
      : [...items, item],
    )
    setEditing(null)
    setModalOpen(false)

    try {
      setSyncState('syncing')
      await upsertSubscription(item, session.user.id)
      setSyncState('idle')
    } catch (error) {
      console.error(error)
      setSyncState('error')
    }
  }

  const deleteSubscription = async (item: Subscription) => {
    if (window.confirm(`Supprimer l’abonnement ${item.name} ?`)) {
      setSubscriptions((items) => items.filter((sub) => sub.id !== item.id))
      try {
        setSyncState('syncing')
        await removeSubscription(item.id)
        setSyncState('idle')
      } catch (error) {
        console.error(error)
        setSyncState('error')
      }
    }
  }

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setSettings((current) => ({ ...current, remindersEnabled: permission === 'granted' }))
  }

  const installApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  const exportData = () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), subscriptions, settings }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `subly-backup-${isoToday()}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!Array.isArray(parsed.subscriptions)) throw new Error('Invalid format')
      setSubscriptions(parsed.subscriptions)
      if (session) await upsertSubscriptions(parsed.subscriptions, session.user.id)
      if (parsed.settings) setSettings({ ...defaultSettings, ...parsed.settings })
    } catch {
      window.alert('Ce fichier ne semble pas être une sauvegarde Subly valide.')
    }
  }

  const saveProvider = async (provider: Provider) => {
    if (!session) return
    setSyncState('syncing')
    try {
      await saveProviderToDb(provider, session.user.id)
      setProviderCatalog((items) => {
        const exists = items.some((item) => item.id === provider.id)
        const next = exists
          ? items.map((item) => item.id === provider.id ? provider : item)
          : [...items, provider]
        return next.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      })

      const affected = subscriptions
        .filter((item) => item.providerId === provider.id)
        .map((item) => ({
          ...item,
          name: provider.name,
          logo: provider.logo,
          website: provider.website,
          category: provider.category,
        }))

      if (affected.length) {
        setSubscriptions((items) => items.map((item) => {
          const updated = affected.find((candidate) => candidate.id === item.id)
          return updated || item
        }))
        await upsertSubscriptions(affected, session.user.id)
      }
      setSyncState('idle')
    } catch (error) {
      console.error(error)
      setSyncState('error')
      throw error
    }
  }

  const deleteProvider = async (provider: Provider) => {
    const used = subscriptions.some((item) => item.providerId === provider.id)
    const message = used
      ? `${provider.name} est utilisé par au moins un abonnement. Le fournisseur sera retiré du catalogue, mais les abonnements existants seront conservés. Continuer ?`
      : `Supprimer le fournisseur ${provider.name} ?`
    if (!window.confirm(message)) return

    setSyncState('syncing')
    try {
      await deleteProviderFromDb(provider.id)
      setProviderCatalog((items) => items.filter((item) => item.id !== provider.id))
      setSyncState('idle')
    } catch (error) {
      console.error(error)
      setSyncState('error')
    }
  }

  const clearAll = async () => {
    if (!window.confirm('Effacer tous les abonnements ?')) return
    setSubscriptions([])
    try {
      setSyncState('syncing')
      await removeAllSubscriptions()
      setSyncState('idle')
    } catch (error) {
      console.error(error)
      setSyncState('error')
    }
  }

  if (!authReady) {
    return <div className="auth-loading"><RefreshCw size={28} className="spin" /><span>Ouverture de Subly…</span></div>
  }

  if (!session) return <AuthScreen />
  if (passwordRecovery) {
    return <ResetPasswordScreen onComplete={() => setPasswordRecovery(false)} />
  }

  const budgetPercent = settings.monthlyBudget > 0 ? Math.min((monthly / settings.monthlyBudget) * 100, 100) : 0
  const budgetDiff = settings.monthlyBudget - monthly

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/abonnement/icon.svg" alt="" />
          <span>Subly</span>
        </div>
        <nav>
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home size={19} /> Vue d’ensemble</button>
          <button className={view === 'subscriptions' ? 'active' : ''} onClick={() => setView('subscriptions')}><WalletCards size={19} /> Abonnements <span className="nav-count">{subscriptions.length}</span></button>
          <button className={view === 'budget' ? 'active' : ''} onClick={() => setView('budget')}><CircleDollarSign size={19} /> Budget</button>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><SettingsIcon size={19} /> Réglages</button>
        </nav>
        <div className="sidebar-card">
          <Sparkles size={18} />
          <strong>{formatMoney(monthly)}</strong>
          <span>dépensés par mois</span>
          <div className="mini-progress"><i style={{ width: `${budgetPercent}%` }} /></div>
          <small>{Math.round(budgetPercent)} % du budget</small>
        </div>
        <div className="sidebar-footer"><span>Données privées</span><small>Synchronisées avec Supabase</small></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Gestionnaire personnel</p>
            <h1>
              {view === 'home' && 'Mes abonnements'}
              {view === 'subscriptions' && 'Tous les abonnements'}
              {view === 'budget' && 'Budget'}
              {view === 'settings' && 'Réglages'}
            </h1>
          </div>
          <div className="top-actions">
            <span className={`sync-pill ${syncState}`}>{syncState === 'syncing' ? <RefreshCw size={14} className="spin" /> : <Cloud size={14} />}{syncState === 'syncing' ? 'Synchro…' : syncState === 'error' ? 'Hors ligne' : 'Synchronisé'}</span>
            {installPrompt && <button className="secondary-btn install-btn" onClick={installApp}><Download size={17} /> Installer</button>}
            <button className="icon-btn theme-btn" onClick={() => setSettings((current) => ({ ...current, theme: current.theme === 'dark' ? 'light' : 'dark' }))} aria-label="Changer de thème">
              {settings.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="primary-btn add-btn" onClick={openAdd}><Plus size={18} /> <span>Ajouter</span></button>
          </div>
        </header>

        {view === 'home' && (
          <>
            <section className="metrics-grid">
              <div className="metric-card accent-card">
                <div className="metric-icon"><WalletCards size={20} /></div>
                <span>Coût mensuel</span>
                <strong>{formatMoney(monthly)}</strong>
                <small>{activeCount} abonnement{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}</small>
              </div>
              <div className="metric-card">
                <div className="metric-icon"><CircleDollarSign size={20} /></div>
                <span>Projection annuelle</span>
                <strong>{formatMoney(annual)}</strong>
                <small>sur la base actuelle</small>
              </div>
              <div className="metric-card">
                <div className="metric-icon"><CalendarClock size={20} /></div>
                <span>Prochaine échéance</span>
                <strong>{upcoming[0] ? nextRenewalLabel(upcoming[0].renewalDate) : '—'}</strong>
                <small>{upcoming[0] ? upcoming[0].name : 'Aucune échéance'}</small>
              </div>
              <div className="metric-card">
                <div className="metric-icon"><BellRing size={20} /></div>
                <span>Dans les 30 jours</span>
                <strong>{upcoming.filter((item) => daysUntil(item.renewalDate) <= 30).length}</strong>
                <small>renouvellement(s)</small>
              </div>
            </section>

            <section className="dashboard-grid">
              <div className="panel upcoming-panel">
                <div className="panel-header">
                  <div><span className="eyebrow">À surveiller</span><h2>Prochaines échéances</h2></div>
                  <button className="text-btn" onClick={() => setView('subscriptions')}>Tout voir <ChevronRight size={16} /></button>
                </div>
                {upcoming.length === 0 ? <EmptyState onAdd={openAdd} /> : (
                  <div className="renewal-list">
                    {upcoming.slice(0, 5).map((item) => (
                      <button key={item.id} className="renewal-item" onClick={() => { setEditing(item); setModalOpen(true) }}>
                        <ProviderLogo name={item.name} logo={item.logo} size="sm" />
                        <span className="renewal-name"><strong>{item.name}</strong><small>{item.category}</small></span>
                        <span className={`renewal-badge ${daysUntil(item.renewalDate) <= 3 ? 'urgent' : ''}`}>{nextRenewalLabel(item.renewalDate)}</span>
                        <span className="renewal-price"><strong>{formatMoney(item.price)}</strong><small>/{cycleLabel(item.cycle)}</small></span>
                        <ChevronRight size={16} className="renewal-chevron" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel budget-panel">
                <div className="panel-header">
                  <div><span className="eyebrow">Ce mois-ci</span><h2>Mon budget</h2></div>
                  <button className="icon-btn tiny" onClick={() => setView('budget')}><MoreHorizontal size={18} /></button>
                </div>
                <div className="budget-ring-wrap">
                  <div className="budget-ring" style={{ '--p': `${budgetPercent * 3.6}deg` } as React.CSSProperties}>
                    <div><strong>{Math.round(budgetPercent)}%</strong><span>utilisé</span></div>
                  </div>
                </div>
                <div className="budget-numbers">
                  <span><small>Dépenses</small><strong>{formatMoney(monthly)}</strong></span>
                  <span><small>Budget</small><strong>{formatMoney(settings.monthlyBudget)}</strong></span>
                </div>
                <div className={`budget-note ${budgetDiff < 0 ? 'negative' : ''}`}>
                  {budgetDiff >= 0 ? `Il te reste ${formatMoney(budgetDiff)} ce mois-ci.` : `Budget dépassé de ${formatMoney(Math.abs(budgetDiff))}.`}
                </div>
              </div>
            </section>
          </>
        )}

        {view === 'subscriptions' && (
          <section className="subscriptions-view">
            <div className="toolbar">
              <div className="search-input wide"><Search size={18} /><input placeholder="Rechercher un abonnement…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
              <div className="filter-row">
                <SlidersHorizontal size={17} />
                {([
                  ['all', 'Tous'],
                  ['soon', '≤ 30 jours'],
                  ['trial', 'Essais'],
                  ['expensive', 'Plus chers'],
                ] as [Filter, string][]).map(([value, label]) => (
                  <button className={filter === value ? 'active' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
            </div>
            {filtered.length === 0 ? <EmptyState onAdd={openAdd} /> : (
              <div className="subscriptions-grid">
                {filtered.map((item) => (
                  <SubscriptionCard
                    key={item.id}
                    item={item}
                    onEdit={() => { setEditing(item); setModalOpen(true) }}
                    onDelete={() => deleteSubscription(item)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {view === 'budget' && (
          <section className="budget-view">
            <div className="budget-hero panel">
              <div>
                <span className="eyebrow">Budget mensuel</span>
                <h2>{formatMoney(monthly)} <span>/ {formatMoney(settings.monthlyBudget)}</span></h2>
                <p>{budgetDiff >= 0 ? `${formatMoney(budgetDiff)} encore disponibles` : `${formatMoney(Math.abs(budgetDiff))} au-dessus de ton objectif`}</p>
              </div>
              <div className="budget-edit">
                <label htmlFor="budget">Mon plafond mensuel</label>
                <div className="money-input"><input id="budget" type="number" min="0" step="5" value={settings.monthlyBudget} onChange={(e) => setSettings({ ...settings, monthlyBudget: Number(e.target.value) })} /><span>€</span></div>
              </div>
            </div>
            <div className="budget-progress"><i style={{ width: `${budgetPercent}%` }} /></div>
            <div className="budget-layout">
              <div className="panel">
                <div className="panel-header"><div><span className="eyebrow">Répartition</span><h2>Par catégorie</h2></div></div>
                {categoriesSpend.length === 0 ? <p className="muted">Ajoute des abonnements pour voir la répartition.</p> : (
                  <div className="category-spend-list">
                    {categoriesSpend.map(([category, value]) => (
                      <div className="category-spend" key={category}>
                        <div><span>{category}</span><strong>{formatMoney(value)}<small>/mois</small></strong></div>
                        <div className="category-bar"><i style={{ width: `${monthly ? (value / monthly) * 100 : 0}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="panel insights-panel">
                <div className="panel-header"><div><span className="eyebrow">Analyse</span><h2>Repères rapides</h2></div></div>
                <div className="insight-item"><span>Coût moyen</span><strong>{formatMoney(activeCount ? monthly / activeCount : 0)}<small>/abonnement</small></strong></div>
                <div className="insight-item"><span>Coût annuel</span><strong>{formatMoney(annual)}</strong></div>
                <div className="insight-item"><span>Catégorie principale</span><strong>{categoriesSpend[0]?.[0] || '—'}</strong></div>
                <div className="insight-item"><span>Abonnement le plus cher</span><strong>{subscriptions.length ? [...subscriptions].sort((a,b) => toMonthly(b.price,b.cycle) - toMonthly(a.price,a.cycle))[0]?.name : '—'}</strong></div>
              </div>
            </div>
          </section>
        )}

        {view === 'settings' && (
          <section className="settings-view">
            <ProviderManager
              providers={providerCatalog}
              categories={categoryCatalog}
              onSave={saveProvider}
              onDelete={deleteProvider}
            />
            <div className="settings-card panel">
              <div className="settings-icon"><Bell size={21} /></div>
              <div className="settings-copy"><h3>Rappels de renouvellement</h3><p>Affiche une notification quand une échéance approche, selon les délais choisis pour chaque abonnement.</p></div>
              <button className={settings.remindersEnabled ? 'secondary-btn success-btn' : 'primary-btn'} onClick={requestNotifications}>
                {settings.remindersEnabled ? <><Check size={17} /> Activés</> : <><BellRing size={17} /> Activer</>}
              </button>
            </div>
            <div className="settings-card panel">
              <div className="settings-icon">{settings.theme === 'dark' ? <Moon size={21} /> : <Sun size={21} />}</div>
              <div className="settings-copy"><h3>Apparence</h3><p>Choisis un thème confortable pour ton téléphone et ton ordinateur.</p></div>
              <button className="secondary-btn" onClick={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}>{settings.theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</button>
            </div>
            {installPrompt && (
              <div className="settings-card panel">
                <div className="settings-icon"><Download size={21} /></div>
                <div className="settings-copy"><h3>Installer Subly</h3><p>Ajoute l’application à l’écran d’accueil pour l’utiliser comme une vraie application.</p></div>
                <button className="primary-btn" onClick={installApp}><Download size={17} /> Installer</button>
              </div>
            )}
            <div className="settings-card panel">
              <div className="settings-icon"><Download size={21} /></div>
              <div className="settings-copy"><h3>Sauvegarde locale</h3><p>Exporte tes abonnements en JSON ou restaure une sauvegarde sur un autre appareil.</p></div>
              <div className="settings-actions">
                <button className="secondary-btn" onClick={exportData}><Download size={17} /> Exporter</button>
                <button className="secondary-btn" onClick={() => importRef.current?.click()}><Upload size={17} /> Importer</button>
                <input ref={importRef} hidden type="file" accept="application/json" onChange={(e) => importData(e.target.files?.[0])} />
              </div>
            </div>
            <div className="settings-card panel">
              <div className="settings-icon"><Cloud size={21} /></div>
              <div className="settings-copy"><h3>Compte & synchronisation</h3><p>{session.user.email} · données sauvegardées dans Supabase.</p></div>
              <button className="secondary-btn" onClick={() => supabase.auth.signOut()}><LogOut size={17} /> Déconnexion</button>
            </div>
            <div className="settings-card panel danger-zone">
              <div className="settings-icon"><Trash2 size={21} /></div>
              <div className="settings-copy"><h3>Effacer les données</h3><p>Supprime définitivement tes abonnements de cet appareil et de Supabase.</p></div>
              <button className="secondary-btn danger-btn" onClick={clearAll}><Trash2 size={17} /> Effacer</button>
            </div>
          </section>
        )}
      </main>

      <nav className="mobile-nav">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}><Home size={21} /><span>Accueil</span></button>
        <button className={view === 'subscriptions' ? 'active' : ''} onClick={() => setView('subscriptions')}><WalletCards size={21} /><span>Abonnements</span></button>
        <button className="mobile-add" onClick={openAdd}><Plus size={25} /></button>
        <button className={view === 'budget' ? 'active' : ''} onClick={() => setView('budget')}><CircleDollarSign size={21} /><span>Budget</span></button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><SettingsIcon size={21} /><span>Réglages</span></button>
      </nav>

      {modalOpen && (
        <SubscriptionModal
          initial={editing}
          providers={providerCatalog}
          categories={categoryCatalog}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSave={saveSubscription}
        />
      )}
    </div>
  )
}

export default App
