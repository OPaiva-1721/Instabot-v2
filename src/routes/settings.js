import { writeFileSync, existsSync, createReadStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { lerEnv, salvarEnv } from '../utils/env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../data')
const LOGO_PATH = join(DATA_DIR, 'logo.png')

const ALLOWED_KEYS = new Set([
  'SHOPEE_APP_ID', 'SHOPEE_SECRET', 'DESCONTO_MINIMO',
  'PUBLIC_URL',
  'ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_TOM', 'CLAUDE_HASHTAGS_PADRAO', 'CLAUDE_PROMPT_BASE',
  'AUTO_PUBLISH',
  'PORT', 'API_KEY', 'FRONTEND_URL'
])

export default async function settingsRoutes(app) {
  app.get('/settings', async () => {
    const env = lerEnv()
    const result = {}
    for (const key of ALLOWED_KEYS) {
      result[key] = { value: env[key] ?? '' }
    }
    return result
  })

  app.post('/settings', async (req, reply) => {
    const body = req.body ?? {}
    const updates = {}
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(k)) {
        updates[k] = String(v)
        process.env[k] = String(v)
      }
    }
    salvarEnv(updates)
    return { ok: true }
  })

  app.get('/settings/logo', async (req, reply) => {
    if (!existsSync(LOGO_PATH)) return reply.code(404).send({ error: 'logo não configurada' })
    return reply.type('image/png').send(createReadStream(LOGO_PATH))
  })

  app.post('/settings/logo', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'arquivo obrigatório' })

    if (!['image/png', 'image/jpeg'].includes(data.mimetype)) {
      return reply.code(400).send({ error: 'apenas PNG ou JPEG' })
    }

    const chunks = []
    for await (const chunk of data.file) chunks.push(chunk)
    const buffer = Buffer.concat(chunks)

    if (buffer.length > 2 * 1024 * 1024) {
      return reply.code(400).send({ error: 'arquivo muito grande (máx 2MB)' })
    }

    writeFileSync(LOGO_PATH, buffer)
    return { ok: true }
  })
}
