// Client de l'API Subly (MariaDB). Surchargeable via VITE_API_URL (voir .env.example).
export const API_URL = (import.meta.env.VITE_API_URL ?? 'https://subly.clubika.com').replace(/\/+$/, '')

const SESSION_KEY = 'subly-session-v1'

export type User = { id: string; email: string }
export type Session = { token: string; user: User }
export type AuthConfig = { emailEnabled: boolean; minPasswordLength: number }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
  }
}

type Listener = (session: Session | null) => void
const listeners = new Set<Listener>()

const readSession = (): Session | null => {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    return value && typeof value.token === 'string' && value.user?.id ? value : null
  } catch {
    return null
  }
}

let current = readSession()

const setSession = (session: Session | null) => {
  current = session
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Sans stockage local, la session ne dure que le temps de l'onglet.
  }
  listeners.forEach((listener) => listener(session))
}

export async function api<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  const token = current?.token
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Serveur injoignable. Vérifie ta connexion.', 0, 'network')
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : undefined
  if (!response.ok) {
    // Session révoquée ou expirée : retour à l'écran de connexion.
    if (response.status === 401 && token && current?.token === token) setSession(null)
    throw new ApiError(data?.message || 'Erreur serveur.', response.status, data?.error)
  }
  return data as T
}

export const auth = {
  getSession: () => current,

  onChange(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  async signIn(email: string, password: string) {
    setSession(await api<Session>('POST', '/auth/login', { email, password }))
  },

  async signUp(email: string, password: string) {
    setSession(await api<Session>('POST', '/auth/signup', { email, password }))
  },

  async signOut() {
    try {
      await api('POST', '/auth/logout')
    } catch {
      // Déconnexion locale même si le serveur est injoignable.
    }
    setSession(null)
  },

  /** Vérifie que la session stockée est toujours valide côté serveur. */
  async refresh() {
    if (!current) return
    const { user } = await api<{ user: User }>('GET', '/auth/user')
    if (current) setSession({ ...current, user })
  },

  config: () => api<AuthConfig>('GET', '/auth/config'),

  resetPasswordForEmail: (email: string) => api('POST', '/auth/recover', { email }),

  /** Échange un lien de récupération reçu par e-mail contre une session. */
  async verifyRecovery(token: string) {
    setSession(await api<Session>('POST', '/auth/verify', { type: 'recovery', token }))
  },

  updatePassword: (password: string) => api('PUT', '/auth/password', { password }),
}

/** `#auth=recovery:<jeton>` laissé par le lien e-mail ; retiré de l'URL dès la lecture. */
export function takeRecoveryToken(): string | null {
  const match = /^#auth=recovery:([\w-]+)$/.exec(window.location.hash)
  if (!match) return null
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`)
  return match[1]
}
