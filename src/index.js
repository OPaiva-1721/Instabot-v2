import 'dotenv/config'
import Fastify from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'
import cron from 'node-cron'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import routes from './routes/index.js'
import whatsappRoutes from './routes/whatsapp.js'
import settingsRoutes from './routes/settings.js'
import nichosRoutes from './routes/nichos.js'
import canaisRoutes from './routes/canais.js'
import tiktokRoutes from './routes/tiktok.js'
import { rodarScraper } from './scraper/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = join(__dirname, '../data/images')
mkdirSync(IMAGES_DIR, { recursive: true })

const app = Fastify({ logger: true })

app.register(fastifyCors, {
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
  credentials: true
})
app.register(fastifyMultipart, { limits: { fileSize: 2 * 1024 * 1024 } })
app.register(fastifyStatic, { root: IMAGES_DIR, prefix: '/images/' })
app.register(routes)
app.register(whatsappRoutes)
app.register(settingsRoutes)
app.register(nichosRoutes)
app.register(canaisRoutes)
app.register(tiktokRoutes)

cron.schedule('*/15 * * * *', async () => {
  try {
    await rodarScraper()
  } catch (e) {
    console.error('[cron] erro no scraper:', e.message)
  }
})

try {
  await app.listen({ port: process.env.PORT ?? 3000, host: '0.0.0.0' })
  console.log(`[api] rodando em http://localhost:${process.env.PORT ?? 3000}`)
} catch (e) {
  app.log.error(e)
  process.exit(1)
}

rodarScraper().catch(e => console.error('[boot] scraper falhou:', e.message))
