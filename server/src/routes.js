import { badRequest } from './http.js'
import { toIso } from './db.js'

const MAX_BATCH = 1000

const asArray = (body) => {
  const items = Array.isArray(body) ? body : body && typeof body === 'object' ? [body] : null
  if (!items) throw badRequest('Liste attendue.')
  if (items.length > MAX_BATCH) throw badRequest(`${MAX_BATCH} éléments maximum par requête.`)
  return items
}

const text = (value, field, { required = true, max = 255 } = {}) => {
  if (value === null || value === undefined || value === '') {
    if (required) throw badRequest(`Champ ${field} manquant.`)
    return null
  }
  if (typeof value !== 'string' || value.length > max) throw badRequest(`Champ ${field} invalide.`)
  return value
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const date = (value, field, required = true) => {
  if (!value && !required) return null
  if (typeof value !== 'string' || !DATE.test(value)) throw badRequest(`Champ ${field} invalide.`)
  return value
}

const LOGO_MAX = 2_000_000

const providerRow = (item) => [
  text(item.id, 'id', { max: 128 }),
  text(item.name, 'name'),
  text(item.category, 'category', { max: 64 }),
  text(item.logo, 'logo', { required: false, max: LOGO_MAX }) || '',
  text(item.website, 'website', { required: false, max: 2048 }),
  text(item.color, 'color', { required: false, max: 32 }),
]

const subscriptionRow = (item) => {
  const price = Number(item.price)
  if (!Number.isFinite(price) || price < 0) throw badRequest('Champ price invalide.')
  const remindDays = Array.isArray(item.remind_days) ? item.remind_days : []
  if (!remindDays.every((value) => Number.isInteger(value))) throw badRequest('Champ remind_days invalide.')
  return [
    text(item.id, 'id', { max: 64 }),
    text(item.provider_id, 'provider_id', { required: false, max: 128 }),
    text(item.name, 'name'),
    text(item.logo, 'logo', { required: false, max: LOGO_MAX }) || '',
    text(item.website, 'website', { required: false, max: 2048 }),
    text(item.category, 'category', { max: 64 }),
    price,
    item.currency || 'EUR',
    item.cycle,
    date(item.start_date, 'start_date'),
    date(item.renewal_date, 'renewal_date'),
    date(item.expiration_date, 'expiration_date', false),
    item.status,
    item.auto_renew !== false,
    JSON.stringify(remindDays),
    text(item.notes, 'notes', { required: false, max: 10_000 }),
  ]
}

const fromSubscription = (row) => ({
  ...row,
  price: Number(row.price),
  auto_renew: Boolean(row.auto_renew),
  remind_days: typeof row.remind_days === 'string' ? JSON.parse(row.remind_days) : row.remind_days,
  created_at: toIso(row.created_at),
})

export function registerRoutes(router, { pool, auth }) {
  router.get('/categories', async ({ req }) => {
    await auth.requireUser(req)
    const [rows] = await pool.query('SELECT id, label FROM subscription_categories ORDER BY sort_order, id')
    return rows
  })

  router.get('/provider-templates', async ({ req }) => {
    await auth.requireUser(req)
    const [rows] = await pool.query(
      'SELECT id, name, category, logo, website, color FROM subscription_provider_templates ORDER BY sort_order, id',
    )
    return rows
  })

  router.get('/providers', async ({ req }) => {
    const user = await auth.requireUser(req)
    const [rows] = await pool.execute(
      'SELECT id, name, category, logo, website, color FROM subscription_providers WHERE user_id = ? ORDER BY name',
      [user.id],
    )
    return rows
  })

  router.put('/providers', async ({ req, body }) => {
    const user = await auth.requireUser(req)
    const rows = asArray(body).map(providerRow)
    if (rows.length) {
      await pool.query(
        `INSERT INTO subscription_providers (user_id, id, name, category, logo, website, color) VALUES ?
         ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), logo = VALUES(logo),
           website = VALUES(website), color = VALUES(color), updated_at = UTC_TIMESTAMP(3)`,
        [rows.map((row) => [user.id, ...row])],
      )
    }
    return null
  })

  router.delete('/providers/:id', async ({ req, params }) => {
    const user = await auth.requireUser(req)
    await pool.execute('DELETE FROM subscription_providers WHERE user_id = ? AND id = ?', [user.id, params.id])
    return null
  })

  router.get('/subscriptions', async ({ req }) => {
    const user = await auth.requireUser(req)
    const [rows] = await pool.execute(
      `SELECT id, provider_id, name, logo, website, category, price, currency, cycle, start_date, renewal_date,
              expiration_date, status, auto_renew, remind_days, notes, created_at
         FROM subscriptions WHERE user_id = ? ORDER BY renewal_date, created_at`,
      [user.id],
    )
    return rows.map(fromSubscription)
  })

  router.put('/subscriptions', async ({ req, body }) => {
    const user = await auth.requireUser(req)
    const rows = asArray(body).map(subscriptionRow)
    if (rows.length) {
      await pool.query(
        `INSERT INTO subscriptions (user_id, id, provider_id, name, logo, website, category, price, currency, cycle,
           start_date, renewal_date, expiration_date, status, auto_renew, remind_days, notes) VALUES ?
         ON DUPLICATE KEY UPDATE provider_id = VALUES(provider_id), name = VALUES(name), logo = VALUES(logo),
           website = VALUES(website), category = VALUES(category), price = VALUES(price), currency = VALUES(currency),
           cycle = VALUES(cycle), start_date = VALUES(start_date), renewal_date = VALUES(renewal_date),
           expiration_date = VALUES(expiration_date), status = VALUES(status), auto_renew = VALUES(auto_renew),
           remind_days = VALUES(remind_days), notes = VALUES(notes)`,
        [rows.map((row) => [user.id, ...row])],
      )
    }
    return null
  })

  router.delete('/subscriptions/:id', async ({ req, params }) => {
    const user = await auth.requireUser(req)
    await pool.execute('DELETE FROM subscriptions WHERE user_id = ? AND id = ?', [user.id, params.id])
    return null
  })

  router.delete('/subscriptions', async ({ req }) => {
    const user = await auth.requireUser(req)
    await pool.execute('DELETE FROM subscriptions WHERE user_id = ?', [user.id])
    return null
  })

  router.get('/settings', async ({ req }) => {
    const user = await auth.requireUser(req)
    const [rows] = await pool.execute(
      'SELECT theme, reminders_enabled FROM subscription_settings WHERE user_id = ?',
      [user.id],
    )
    return { settings: rows[0] ? { theme: rows[0].theme, reminders_enabled: Boolean(rows[0].reminders_enabled) } : null }
  })

  router.put('/settings', async ({ req, body }) => {
    const user = await auth.requireUser(req)
    await pool.execute(
      `INSERT INTO subscription_settings (user_id, theme, reminders_enabled) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE theme = VALUES(theme), reminders_enabled = VALUES(reminders_enabled)`,
      [user.id, body?.theme, Boolean(body?.reminders_enabled)],
    )
    return null
  })
}
