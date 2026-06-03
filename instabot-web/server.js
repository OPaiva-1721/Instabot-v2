import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const BACKEND = process.env.BACKEND_URL?.replace(/\/$/, '')

if (BACKEND) {
  const proxyOpts = {
    target: BACKEND,
    changeOrigin: true,
    headers: { 'ngrok-skip-browser-warning': 'true' },
    on: {
      error: (err, req, res) => {
        console.error('[proxy]', err.message)
        res.status(502).json({ error: 'backend indisponível' })
      }
    }
  }
  app.use('/api', createProxyMiddleware({ ...proxyOpts, pathRewrite: { '^/api': '' } }))
  app.use('/tiktok', createProxyMiddleware({ ...proxyOpts, pathRewrite: { '^': '/tiktok' } }))
  console.log(`[proxy] /api, /tiktok → ${BACKEND}`)
} else {
  console.warn('[proxy] BACKEND_URL não configurada')
}

app.use(express.static(join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`[server] porta ${port}`))
