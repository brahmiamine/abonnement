import type { Page, Route } from '@playwright/test'

type Row = Record<string, unknown>

export const USER = { id: 'user-1', email: 'test@subly.app' }

const day = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const provider = (id: string, name: string, category: string, website: string) => ({
  user_id: USER.id,
  id,
  name,
  category,
  logo: '',
  website,
  color: '#111827',
})

export const CATEGORIES = [
  'Streaming', 'Musique', 'IA', 'Cloud', 'Productivité', 'Gaming', 'Sport',
  'Télécom', 'Assurance', 'Énergie', 'Transport', 'Fitness', 'Autre',
]

export const longName = 'Un abonnement avec un nom vraiment très très long pour tester le débordement'

export function seedData(): Record<string, Row[]> {
  const subscription = (
    id: string, providerId: string | null, name: string, category: string,
    price: number, cycle: string, renewal: number, extra: Row = {},
  ) => ({
    id, user_id: USER.id, provider_id: providerId, name, logo: '', website: null, category,
    price, currency: 'EUR', cycle, start_date: day(-60), renewal_date: day(renewal),
    expiration_date: null, status: 'active', auto_renew: true, remind_days: [7, 3, 1],
    notes: null, created_at: '2026-01-01T00:00:00Z', ...extra,
  })

  return {
    subscription_categories: CATEGORIES.map((id, index) => ({ id, label: id, sort_order: index })),
    subscription_provider_templates: [],
    subscription_providers: [
      provider('netflix', 'Netflix', 'Streaming', 'https://netflix.com'),
      provider('spotify', 'Spotify', 'Musique', 'https://spotify.com'),
      provider('chatgpt', 'ChatGPT Plus', 'IA', 'https://chatgpt.com'),
      provider('icloud', 'iCloud+', 'Cloud', 'https://icloud.com'),
    ],
    subscriptions: [
      subscription('s1', 'netflix', 'Netflix', 'Streaming', 17.99, 'monthly', 3),
      subscription('s2', 'spotify', 'Spotify', 'Musique', 10.99, 'monthly', 12),
      subscription('s3', 'chatgpt', 'ChatGPT Plus', 'IA', 20, 'monthly', 25, { status: 'trial' }),
      subscription('s4', 'icloud', 'iCloud+', 'Cloud', 99.99, 'yearly', 200),
      subscription('s5', null, longName, 'Autre', 1234.56, 'yearly', 40),
    ],
    subscription_settings: [],
  }
}

export type MockBackend = {
  tables: Record<string, Row[]>
  failTable?: string
}

const TABLE_BY_PATH: Record<string, string> = {
  categories: 'subscription_categories',
  'provider-templates': 'subscription_provider_templates',
  providers: 'subscription_providers',
  subscriptions: 'subscriptions',
}

/** Remplace entièrement l'API Subly (auth + données) par une base en mémoire. */
export async function mockApi(page: Page, options: {
  signedIn?: boolean
  data?: Record<string, Row[]>
  theme?: 'dark' | 'light'
} = {}): Promise<MockBackend> {
  const { signedIn = true, data = seedData(), theme } = options
  const backend: MockBackend = { tables: structuredClone(data) }

  if (theme) backend.tables.subscription_settings = [{ user_id: USER.id, theme, reminders_enabled: false }]

  if (signedIn) {
    await page.addInitScript((user) => {
      if (!window.localStorage.getItem('subly-session-v1')) {
        window.localStorage.setItem('subly-session-v1', JSON.stringify({ token: 'test-token', user }))
      }
    }, USER)
  }

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
      body: status === 204 ? '' : JSON.stringify(body),
    })

  await page.route('**/subly.clubika.com/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const [resource, id] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)

    if (method === 'OPTIONS') return json(route, {}, 204)

    if (resource === 'auth') {
      if (id === 'config') return json(route, { emailEnabled: true, minPasswordLength: 8 })
      if (id === 'user') return json(route, { user: USER })
      if (id === 'logout') return json(route, null, 204)
      if (id === 'login') return json(route, { error: 'invalid_credentials', message: 'Adresse e-mail ou mot de passe incorrect.' }, 400)
      return json(route, null, 204)
    }

    if (resource === 'settings') {
      const rows = (backend.tables.subscription_settings ??= [])
      if (method === 'GET') {
        const row = rows[0]
        return json(route, { settings: row ? { theme: row.theme, reminders_enabled: row.reminders_enabled } : null })
      }
      backend.tables.subscription_settings = [{ user_id: USER.id, ...(request.postDataJSON() as Row) }]
      return json(route, null, 204)
    }

    const table = TABLE_BY_PATH[resource]
    if (!table) return json(route, { error: 'not_found' }, 404)
    const rows = (backend.tables[table] ??= [])

    if (backend.failTable === table && method !== 'GET') return json(route, { error: 'server_error', message: 'boom' }, 500)

    if (method === 'GET') return json(route, rows)

    if (method === 'PUT') {
      for (const item of request.postDataJSON() as Row[]) {
        const index = rows.findIndex((row) => row.id === item.id)
        if (index >= 0) rows[index] = { ...rows[index], ...item }
        else rows.push({ user_id: USER.id, ...item })
      }
      return json(route, null, 204)
    }

    if (method === 'DELETE') {
      backend.tables[table] = id === undefined ? [] : rows.filter((row) => row.id !== id)
      return json(route, null, 204)
    }

    return json(route, null, 204)
  })
  // Les favicons externes ne doivent pas ralentir ni rendre instables les tests.
  await page.route('**/www.google.com/s2/favicons**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#7c5cff"/></svg>' }),
  )

  return backend
}
