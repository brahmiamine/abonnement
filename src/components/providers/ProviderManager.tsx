import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Edit3, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { customLogo } from '../../data/providers'
import { uid } from '../../config'
import { useExitAnimation } from '../../hooks/useExitAnimation'
import type { Category, Provider } from '../../types'
import { cascade } from '../../utils/motion'
import { ProviderLogo } from '../common/ProviderLogo'

export function ProviderManager({
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

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return providers.filter((provider) =>
      !value || `${provider.name} ${provider.category}`.toLowerCase().includes(value),
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

  const close = () => {
    setDraft(null)
    setEditing(null)
  }

  return (
    <div className="providers-panel panel rise">
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
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="provider-admin-list">
        {filtered.map((provider, index) => (
          <div className="provider-admin-row rise" style={cascade(index, 35, 80)} key={provider.id}>
            <ProviderLogo name={provider.name} logo={provider.logo} size="sm" />
            <div className="provider-admin-copy">
              <strong>{provider.name}</strong>
              <span>
                {provider.category}
                {provider.website
                  ? ` · ${provider.website.replace(/^https?:\/\//, '').split('/')[0]}`
                  : ''}
              </span>
            </div>
            <button className="icon-btn tiny" onClick={() => openEdit(provider)} aria-label={`Modifier ${provider.name}`}>
              <Edit3 size={16} />
            </button>
            <button className="icon-btn tiny danger" onClick={() => onDelete(provider)} aria-label={`Supprimer ${provider.name}`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="muted provider-empty">Aucun fournisseur trouvé.</p>}
      </div>

      {draft && (
        <ProviderEditor
          key={draft.id}
          initial={draft}
          editing={editing}
          categories={categories}
          onSave={onSave}
          onClose={close}
        />
      )}
    </div>
  )
}

function ProviderEditor({
  initial,
  editing,
  categories,
  onSave,
  onClose,
}: {
  initial: Provider
  editing: Provider | null
  categories: Category[]
  onSave: (provider: Provider) => Promise<void>
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [closing, close] = useExitAnimation(onClose)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.name.trim() || saving) return

    setSaving(true)
    setError('')
    try {
      const logo = draft.logo.trim() || customLogo(draft.website)
      await onSave({ ...draft, name: draft.name.trim(), logo })
      close()
    } catch {
      setError('Impossible d’enregistrer le fournisseur.')
    } finally {
      setSaving(false)
    }
  }

  // Rendu dans <body> : le conteneur principal (container query) piégerait le position: fixed.
  return createPortal(
    <div
      className={`provider-editor-backdrop ${closing ? 'is-closing' : ''}`}
      role="presentation"
      onMouseDown={close}
    >
      <form
        className="provider-editor modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <span className="sheet-handle" aria-hidden="true" />
          <div>
            <span className="eyebrow">{editing ? 'Modification' : 'Nouveau fournisseur'}</span>
            <h2>{editing ? editing.name : 'Ajouter un fournisseur'}</h2>
          </div>
          <button type="button" className="icon-btn close-btn" onClick={close} aria-label="Fermer"><X size={20} /></button>
        </div>

        <div className="provider-editor-body">
          <div className="provider-preview-card">
            <ProviderLogo name={draft.name || 'Nouveau'} logo={draft.logo || customLogo(draft.website)} size="lg" />
            <div>
              <strong>{draft.name || 'Nom du fournisseur'}</strong>
              <span>{draft.category}</span>
            </div>
          </div>

          <div className="field">
            <label>Nom</label>
            <input
              required
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Ex. RED by SFR Mobile"
            />
          </div>

          <div className="field">
            <label>Catégorie</label>
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
            >
              {categories.map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Site web <span>optionnel</span></label>
            <input
              type="url"
              value={draft.website}
              onChange={(event) => setDraft({ ...draft, website: event.target.value })}
              placeholder="https://…"
            />
          </div>

          <div className="field">
            <label>URL du logo <span>optionnel</span></label>
            <input
              type="url"
              value={draft.logo}
              onChange={(event) => setDraft({ ...draft, logo: event.target.value })}
              placeholder="https://…/logo.png"
            />
            <small className="field-help">Si vide, Subly essaie d’utiliser automatiquement l’icône du site web.</small>
          </div>

          {error && <div className="auth-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={close}>Annuler</button>
            <button className="primary-btn" disabled={saving}>
              {saving ? <RefreshCw size={17} className="spin" /> : <Check size={17} />}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  )
}
