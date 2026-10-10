import { useState } from 'react'
import { Check, Eye, EyeOff, LockKeyhole, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ResetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  // Indicateur simple : un segment tous les 3 caractères, 4 au maximum.
  const strength = Math.min(4, Math.floor(password.length / 3))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessage('')

    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères.')
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
      window.history.replaceState({}, document.title, import.meta.env.BASE_URL)
      onComplete()
    } catch (value) {
      setMessage(value instanceof Error ? value.message : 'Impossible de modifier le mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-blob auth-blob--violet" aria-hidden="true" />
      <div className="auth-card">
        <div className="brand auth-brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
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
                minLength={8}
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8 caractères minimum"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className={`password-strength level-${strength}`} aria-hidden="true">
              {[0, 1, 2, 3].map((segment) => (
                <i key={segment} className={segment < strength ? 'on' : ''} />
              ))}
            </div>
          </div>

          <div className="field">
            <label>Confirmer le mot de passe</label>
            <div className="auth-input password-input">
              <LockKeyhole size={18} />
              <input
                type={showConfirmation ? 'text' : 'password'}
                minLength={8}
                required
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Répète le mot de passe"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmation((value) => !value)}
                aria-label={showConfirmation ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
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
