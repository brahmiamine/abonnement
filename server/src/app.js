import { createAuth } from './auth.js'
import { createRouter, createServer } from './http.js'
import { createMailer } from './mailer.js'
import { registerRoutes } from './routes.js'

export const DEFAULT_ORIGINS = ['https://brahmiamine.github.io', 'http://localhost:5173', 'http://localhost:4173']

export function createApp({ pool, env = process.env, mailer = createMailer(env), logger = console }) {
  const appUrl = env.APP_URL || 'https://subly.clubika.com/'
  const router = createRouter()
  const auth = createAuth({
    pool,
    mailer,
    appName: 'Subly',
    // Le jeton est placé dans le fragment : il n'est jamais envoyé à un serveur ni journalisé.
    buildLink: (type, token) => `${appUrl}#auth=${type}:${token}`,
    minPasswordLength: 8,
  })

  router.get('/health', async () => {
    await pool.query('SELECT 1')
    return { ok: true }
  })
  auth.register(router)
  registerRoutes(router, { pool, auth })

  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()) : DEFAULT_ORIGINS
  return createServer({ router, allowedOrigins, bodyLimit: 10 * 1024 * 1024, logger, staticDir: env.STATIC_DIR })
}
