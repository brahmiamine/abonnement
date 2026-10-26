// Tests d'intégration contre une vraie base MariaDB de test.
// TEST_DB_NAME, TEST_DB_USER, TEST_DB_PASSWORD (+ TEST_DB_SOCKET ou TEST_DB_HOST) ; ignorés sinon.
import { after, before, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { createPool, migrate } from '../src/db.js'

const env = {
  DB_NAME: process.env.TEST_DB_NAME,
  DB_USER: process.env.TEST_DB_USER,
  DB_PASSWORD: process.env.TEST_DB_PASSWORD,
  DB_SOCKET: process.env.TEST_DB_SOCKET,
  DB_HOST: process.env.TEST_DB_HOST,
  ALLOWED_ORIGINS: 'https://brahmiamine.github.io',
}
const skip = !env.DB_NAME && 'TEST_DB_NAME non défini'

describe('Subly API', { skip }, () => {
  let pool
  let server
  let base
  const sent = []
  const mailer = { enabled: true, send: async (mail) => { sent.push(mail) } }

  const call = async (method, path, { token, body, origin } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await response.text()
    return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null }
  }

  const signup = async (email = 'a@example.com', password = 'motdepasse1') =>
    (await call('POST', '/auth/signup', { body: { email, password } })).data

  const subscription = (id, extra = {}) => ({
    id, provider_id: 'netflix', name: 'Netflix', logo: '', website: null, category: 'Streaming',
    price: 17.99, currency: 'EUR', cycle: 'monthly', start_date: '2026-01-01', renewal_date: '2026-11-01',
    expiration_date: null, status: 'active', auto_renew: true, remind_days: [7, 1], notes: null, ...extra,
  })

  before(async () => {
    pool = createPool(env)
    await pool.query('SET FOREIGN_KEY_CHECKS = 0')
    const [tables] = await pool.query('SHOW TABLES')
    for (const row of tables) await pool.query(`DROP TABLE \`${Object.values(row)[0]}\``)
    await pool.query('SET FOREIGN_KEY_CHECKS = 1')
    await migrate(new URL('../schema.sql', import.meta.url), env)
    await migrate(new URL('../schema.sql', import.meta.url), env) // idempotent
    server = createApp({ pool, env, mailer, logger: { error() {} } })
    await new Promise((resolve) => server.listen(0, resolve))
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await pool.end()
  })

  beforeEach(async () => {
    sent.length = 0
    await pool.query('DELETE FROM users')
    await pool.query('DELETE FROM subscription_provider_templates')
    await pool.query('DELETE FROM subscription_categories')
  })

  it('inscrit, connecte et déconnecte un utilisateur', async () => {
    const session = await signup()
    assert.ok(session.token)
    assert.equal(session.user.email, 'a@example.com')

    const me = await call('GET', '/auth/user', { token: session.token })
    assert.equal(me.data.user.id, session.user.id)

    const login = await call('POST', '/auth/login', { body: { email: 'A@Example.com', password: 'motdepasse1' } })
    assert.equal(login.status, 200)

    const wrong = await call('POST', '/auth/login', { body: { email: 'a@example.com', password: 'mauvais' } })
    assert.equal(wrong.status, 400)

    await call('POST', '/auth/logout', { token: session.token })
    assert.equal((await call('GET', '/auth/user', { token: session.token })).status, 401)
  })

  it('refuse un doublon et un mot de passe trop court', async () => {
    await signup()
    assert.equal((await call('POST', '/auth/signup', { body: { email: 'a@example.com', password: 'motdepasse1' } })).status, 409)
    assert.equal((await call('POST', '/auth/signup', { body: { email: 'b@example.com', password: 'court' } })).status, 400)
  })

  it('exige une session pour les données', async () => {
    assert.equal((await call('GET', '/subscriptions')).status, 401)
    assert.equal((await call('GET', '/subscriptions', { token: 'faux' })).status, 401)
  })

  it('enregistre, relit et supprime des abonnements', async () => {
    const { token } = await signup()
    assert.equal((await call('PUT', '/subscriptions', { token, body: [subscription('s1'), subscription('s2', { renewal_date: '2026-10-30' })] })).status, 204)

    let list = (await call('GET', '/subscriptions', { token })).data
    assert.deepEqual(list.map((item) => item.id), ['s2', 's1'])
    assert.equal(list[0].price, 17.99)
    assert.deepEqual(list[0].remind_days, [7, 1])
    assert.equal(list[0].auto_renew, true)
    assert.match(list[0].created_at, /^\d{4}-\d{2}-\d{2}T.*Z$/)

    await call('PUT', '/subscriptions', { token, body: [subscription('s1', { price: 9.5 })] })
    list = (await call('GET', '/subscriptions', { token })).data
    assert.equal(list.find((item) => item.id === 's1').price, 9.5)

    await call('DELETE', '/subscriptions/s1', { token })
    assert.equal((await call('GET', '/subscriptions', { token })).data.length, 1)
    await call('DELETE', '/subscriptions', { token })
    assert.equal((await call('GET', '/subscriptions', { token })).data.length, 0)
  })

  it('rejette des données invalides', async () => {
    const { token } = await signup()
    assert.equal((await call('PUT', '/subscriptions', { token, body: [subscription('s1', { cycle: 'daily' })] })).status, 400)
    assert.equal((await call('PUT', '/subscriptions', { token, body: [subscription('s1', { price: -1 })] })).status, 400)
    assert.equal((await call('PUT', '/subscriptions', { token, body: [subscription('s1', { start_date: 'demain' })] })).status, 400)
  })

  it('cloisonne les données entre utilisateurs', async () => {
    const alice = await signup('alice@example.com')
    const bob = await signup('bob@example.com')
    await call('PUT', '/subscriptions', { token: alice.token, body: [subscription('s1')] })
    await call('PUT', '/providers', { token: alice.token, body: [{ id: 'netflix', name: 'Netflix', category: 'Streaming' }] })

    // Même identifiant chez Bob : ne touche pas la ligne d'Alice.
    await call('PUT', '/subscriptions', { token: bob.token, body: [subscription('s1', { name: 'Bob' })] })
    await call('DELETE', '/subscriptions/s1', { token: bob.token })
    await call('DELETE', '/providers/netflix', { token: bob.token })

    const aliceList = (await call('GET', '/subscriptions', { token: alice.token })).data
    assert.equal(aliceList.length, 1)
    assert.equal(aliceList[0].name, 'Netflix')
    assert.equal((await call('GET', '/providers', { token: alice.token })).data.length, 1)
    assert.equal((await call('GET', '/providers', { token: bob.token })).data.length, 0)
  })

  it('gère fournisseurs, catalogue et réglages', async () => {
    const { token } = await signup()
    await pool.query("INSERT INTO subscription_categories (id, label, sort_order) VALUES ('IA', 'IA', 2), ('Streaming', 'Streaming', 1)")
    await pool.query("INSERT INTO subscription_provider_templates (id, name, category, logo, sort_order) VALUES ('spotify', 'Spotify', 'Streaming', '', 1)")

    assert.deepEqual((await call('GET', '/categories', { token })).data.map((row) => row.id), ['Streaming', 'IA'])
    assert.equal((await call('GET', '/provider-templates', { token })).data[0].id, 'spotify')

    await call('PUT', '/providers', { token, body: [{ id: 'z', name: 'Zed', category: 'IA', logo: '', website: null, color: null }, { id: 'a', name: 'Alpha', category: 'IA' }] })
    await call('PUT', '/providers', { token, body: { id: 'z', name: 'Beta', category: 'IA' } })
    assert.deepEqual((await call('GET', '/providers', { token })).data.map((row) => row.name), ['Alpha', 'Beta'])

    assert.deepEqual((await call('GET', '/settings', { token })).data, { settings: null })
    await call('PUT', '/settings', { token, body: { theme: 'light', reminders_enabled: true } })
    assert.deepEqual((await call('GET', '/settings', { token })).data, { settings: { theme: 'light', reminders_enabled: true } })
  })

  it('récupère un compte par lien e-mail à usage unique', async () => {
    const { token: oldToken } = await signup()
    assert.equal((await call('POST', '/auth/recover', { body: { email: 'inconnu@example.com' } })).status, 204)
    assert.equal(sent.length, 0)

    await call('POST', '/auth/recover', { body: { email: 'a@example.com' } })
    assert.equal(sent.length, 1)
    const recoveryToken = /#auth=recovery:([\w-]+)/.exec(sent[0].text)[1]

    const verified = await call('POST', '/auth/verify', { body: { type: 'recovery', token: recoveryToken } })
    assert.equal(verified.status, 200)
    assert.equal((await call('POST', '/auth/verify', { body: { type: 'recovery', token: recoveryToken } })).status, 400)

    await call('PUT', '/auth/password', { token: verified.data.token, body: { password: 'nouveaumdp1' } })
    assert.equal((await call('GET', '/auth/user', { token: oldToken })).status, 401)
    assert.equal((await call('GET', '/auth/user', { token: verified.data.token })).status, 200)
    assert.equal((await call('POST', '/auth/login', { body: { email: 'a@example.com', password: 'nouveaumdp1' } })).status, 200)
  })

  it('autorise uniquement les origines configurées (CORS)', async () => {
    const allowed = await call('GET', '/health', { origin: 'https://brahmiamine.github.io' })
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://brahmiamine.github.io')
    const denied = await call('GET', '/health', { origin: 'https://evil.example' })
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
  })
})
