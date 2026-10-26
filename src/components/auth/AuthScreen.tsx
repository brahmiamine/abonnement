import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, Mail, RefreshCw, UserPlus } from 'lucide-react'
import { auth } from '../../lib/api'

type Mode = 'login' | 'signup' | 'forgot'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  // « Mot de passe oublié » n'est proposé que si le serveur sait envoyer des e-mails.
  const [emailEnabled, setEmailEnabled] = useState(false)

  useEffect(() => {
    let active = true
    auth.config()
      .then((config) => { if (active) setEmailEnabled(config.emailEnabled) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        await auth.signIn(email, password)
      } else if (mode === 'forgot') {
        await auth.resetPasswordForEmail(email)
        setMessage('Lien envoyé. Consulte ton e-mail puis ouvre le lien pour choisir un nouveau mot de passe.')
      } else {
        await auth.signUp(email, password)
      }
    } catch (value) {
      setMessage(value instanceof Error ? value.message : 'Connexion impossible.')
    } finally {
      setLoading(false)
    }
  }

  const passwordMinLength = mode === 'signup' ? 8 : 6

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
          <h1>{mode === 'login' ? 'Connexion' : mode === 'signup' ? 'Créer mon compte' : 'Mot de passe oublié'}</h1>
          <p className="auth-copy">
            {mode === 'forgot'
              ? 'Indique ton adresse e-mail. Nous t’enverrons un lien sécurisé pour définir un nouveau mot de passe.'
              : 'Tes données sont synchronisées sur ton serveur et protégées par ton compte.'}
          </p>

          <form onSubmit={submit}>
            <div className="field">
              <label>Adresse e-mail</label>
              <div className="auth-input">
                <Mail size={18} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nom@email.com"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="field">
                <div className="field-label-row">
                  <label>Mot de passe</label>
                  {mode === 'login' && emailEnabled && (
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => {
                        setMode('forgot')
                        setPassword('')
                        setShowPassword(false)
                        setMessage('')
                      }}
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>

                <div className="auth-input password-input">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    minLength={passwordMinLength}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === 'signup' ? '8 caractères minimum' : 'Mot de passe'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {message && <div className="auth-message">{message}</div>}

            <button className="primary-btn auth-submit" disabled={loading}>
              {loading
                ? <RefreshCw size={18} className="spin" />
                : mode === 'login'
                  ? <LockKeyhole size={18} />
                  : mode === 'signup'
                    ? <UserPlus size={18} />
                    : <Mail size={18} />}
              {loading
                ? 'Chargement…'
                : mode === 'login'
                  ? 'Se connecter'
                  : mode === 'signup'
                    ? 'Créer le compte'
                    : 'Envoyer le lien'}
            </button>
          </form>

          <button
            className="auth-switch"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setPassword('')
              setShowPassword(false)
              setMessage('')
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
    </div>
  )
}
