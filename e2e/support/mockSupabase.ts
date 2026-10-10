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
  'Streaming',
  'Musique',
  'IA',
  'Cloud',
  'Productivité',
  'Gaming',
  'Sport',
  'Télécom',
  'Assurance',
  'Énergie',
  'Transport',
  'Fitness',
  'Autre',
]

export const longName =
  'Un abonnement avec un nom vraiment très très long pour tester le débordement'

export function seedData(): Record<string, Row[]> {
  const subscription = (
    id: string,
    providerId: string | null,
    name: string,
    category: string,
    price: number,
    cycle: string,
    renewal: number,
    extra: Row = {},
  ) => ({
    id,
    user_id: USER.id,
    provider_id: providerId,
    name,
    logo: '',
    website: null,
    category,
    price,
    currency: 'EUR',
    cycle,
    start_date: day(-60),
    renewal_date: day(renewal),
    expiration_date: null,
    status: 'active',
    auto_renew: true,
    remind_days: [7, 3, 1],
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
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

const parseFilters = (url: URL) => {
  const filters: Array<[string, string]> = []
  url.searchParams.forEach((value, key) => {
    if (value.startsWith('eq.')) filters.push([key, value.slice(3)])
  })
  return filters
}

export type MockBackend = {
  tables: Record<string, Row[]>
  failTable?: string
}

/** Remplace entièrement Supabase (auth + PostgREST) par une base en mémoire. */
export async function mockSupabase(
  page: Page,
  options: {
    signedIn?: boolean
    data?: Record<string, Row[]>
    theme?: 'dark' | 'light'
  } = {},
): Promise<MockBackend> {
  const { signedIn = true, data = seedData(), theme } = options
  const backend: MockBackend = { tables: structuredClone(data) }

  if (theme)
    backend.tables.subscription_settings = [{ user_id: USER.id, theme, reminders_enabled: false }]

  if (signedIn) {
    await page.addInitScript((user) => {
      const session = {
        access_token: 'header.payload.signature',
        refresh_token: 'refresh',
        token_type: 'bearer',
        expires_in: 3600 * 24 * 365,
        expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
        user: {
          ...user,
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: '2026-01-01T00:00:00Z',
        },
      }
      if (!window.localStorage.getItem('sb-ewswqwmaejddwqiwaspq-auth-token')) {
        window.localStorage.setItem('sb-ewswqwmaejddwqiwaspq-auth-token', JSON.stringify(session))
      }
    }, USER)
  }

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      },
      body: JSON.stringify(body),
    })

  await page.route('**/*.supabase.co/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    if (method === 'OPTIONS') return json(route, {}, 204)

    if (url.pathname.startsWith('/auth/v1')) {
      if (url.pathname.endsWith('/user')) return json(route, { ...USER, aud: 'authenticated' })
      if (url.pathname.endsWith('/logout')) return json(route, {}, 204)
      if (url.pathname.endsWith('/token'))
        return json(
          route,
          { error: 'invalid_grant', error_description: 'Invalid login credentials' },
          400,
        )
      return json(route, {})
    }

    const table = url.pathname.replace('/rest/v1/', '')
    const rows = (backend.tables[table] ??= [])

    if (backend.failTable === table && method !== 'GET')
      return json(route, { message: 'boom' }, 500)

    if (method === 'GET') {
      const filters = parseFilters(url)
      const result = rows.filter((row) =>
        filters.every(([key, value]) => String(row[key]) === value),
      )
      const single = (request.headers().accept || '').includes('vnd.pgrst.object')
      if (single) {
        return result.length
          ? json(route, result[0])
          : json(
              route,
              {
                code: 'PGRST116',
                details: 'The result contains 0 rows',
                message: 'JSON object requested',
              },
              406,
            )
      }
      return json(route, result)
    }

    if (method === 'POST') {
      const payload = request.postDataJSON() as Row | Row[]
      const incoming = Array.isArray(payload) ? payload : [payload]
      const keys =
        table === 'subscription_providers'
          ? ['user_id', 'id']
          : table === 'subscription_settings'
            ? ['user_id']
            : ['id']
      for (const item of incoming) {
        const index = rows.findIndex((row) => keys.every((key) => row[key] === item[key]))
        if (index >= 0) rows[index] = { ...rows[index], ...item }
        else rows.push(item)
      }
      return json(route, [], 201)
    }

    if (method === 'DELETE') {
      const filters = parseFilters(url)
      backend.tables[table] = rows.filter(
        (row) => !filters.every(([key, value]) => String(row[key]) === value),
      )
      return json(route, [], 204)
    }

    return json(route, [])
  })

  // Les favicons externes ne doivent pas ralentir ni rendre instables les tests.
  await page.route('**/www.google.com/s2/favicons**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#7c5cff"/></svg>',
    }),
  )

  return backend
}
