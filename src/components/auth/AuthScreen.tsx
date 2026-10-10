import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, RefreshCw, Sparkles, UserPlus } from 'lucide-react'
import { APP_URL } from '../../config'
import { MIN_PASSWORD_LENGTH, validatePassword } from '../../domain/password'
import { supabase } from '../../lib/supabase'

type Mode = 'login' | 'signup' | 'forgot' | 'magic'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: APP_URL })
        if (error) throw error
        setMessage(
          'Lien envoyé. Consulte ton e-mail puis ouvre le lien pour choisir un nouveau mot de passe.',
        )
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: APP_URL, shouldCreateUser: true },
        })
        if (error) throw error
        setMessage(
          'Lien envoyé. Ouvre l’e-mail reçu sur cet appareil ou un autre : un clic te connecte, sans mot de passe.',
        )
      } else {
        const weakness = validatePassword(password)
        if (weakness) {
          setMessage(weakness)
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: APP_URL },
        })
        if (error) throw error
        if (!data.session) {
          setMessage(
            'Compte créé. Vérifie ton e-mail pour confirmer ton inscription, puis reconnecte-toi.',
          )
        }
      }
    } catch (value) {
      setMessage(value instanceof Error ? value.message : 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setPassword('')
    setShowPassword(false)
    setMessage('')
  }

  const passwordless = mode === 'forgot' || mode === 'magic'

  return (
    <div className="auth-screen">
      <div className="auth-blob auth-blob--violet" aria-hidden="true" />
      <div className="auth-blob auth-blob--green" aria-hidden="true" />
      <div className="auth-card">
        <div className="brand auth-brand">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />
          <span>Subly</span>
        </div>

        <div className="auth-body" key={mode}>
          <span className="eyebrow">Tes abonnements, partout avec toi</span>
          <h1>
            {mode === 'login'
              ? 'Connexion'
              : mode === 'signup'
                ? 'Créer mon compte'
                : mode === 'magic'
                  ? 'Connexion par e-mail'
                  : 'Mot de passe oublié'}
          </h1>
          <p className="auth-copy">
            {mode === 'forgot'
              ? 'Indique ton adresse e-mail. Nous t’enverrons un lien sécurisé pour définir un nouveau mot de passe.'
              : mode === 'magic'
                ? 'Indique ton adresse e-mail : nous t’envoyons un lien de connexion à usage unique. Aucun mot de passe à retenir.'
                : 'Tes données sont synchronisées dans Supabase et protégées par ton compte.'}
          </p>

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="auth-email">Adresse e-mail</label>
              <div className="auth-input">
                <Mail size={18} />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nom@email.com"
                />
              </div>
            </div>

            {!passwordless && (
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="auth-password">Mot de passe</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => switchMode('forgot')}
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>

                <div className="auth-input password-input">
                  <LockKeyhole size={18} />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    minLength={mode === 'signup' ? MIN_PASSWORD_LENGTH : undefined}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      mode === 'signup'
                        ? `${MIN_PASSWORD_LENGTH} caractères minimum, avec lettres et chiffres`
                        : 'Mot de passe'
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {message && <div className="auth-message">{message}</div>}

            <button className="primary-btn auth-submit" disabled={loading}>
              {loading ? (
                <RefreshCw size={18} className="spin" />
              ) : mode === 'login' ? (
                <LockKeyhole size={18} />
              ) : mode === 'signup' ? (
                <UserPlus size={18} />
              ) : mode === 'magic' ? (
                <Sparkles size={18} />
              ) : (
                <Mail size={18} />
              )}
              {loading
                ? 'Chargement…'
                : mode === 'login'
                  ? 'Se connecter'
                  : mode === 'signup'
                    ? 'Créer le compte'
                    : 'Envoyer le lien'}
            </button>
          </form>

          {(mode === 'login' || mode === 'signup') && (
            <button type="button" className="magic-link-btn" onClick={() => switchMode('magic')}>
              <Sparkles size={16} /> Recevoir un lien de connexion par e-mail
            </button>
          )}

          <button
            className="auth-switch"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login'
              ? 'Pas encore de compte ? Créer un compte'
              : mode === 'signup'
                ? 'Déjà un compte ? Se connecter'
                : '← Retour à la connexion'}
          </button>
        </div>
      </div>
    </div>
  )
}
