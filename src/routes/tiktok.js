import axios from 'axios'
import db from '../db/index.js'

const TOKEN_URL    = 'https://open.tiktokapis.com/v2/oauth/token/'
const AUTH_URL     = 'https://www.tiktok.com/v2/auth/authorize/'
const USERINFO_URL = 'https://open.tiktokapis.com/v2/user/info/'
const SCOPE        = 'user.info.basic,video.publish'

function page(title, body) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TikTok — ${title}</title>
  <style>
    body { background: #0d0d0f; color: #e8e8e8; font-family: system-ui, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .box { text-align: center; padding: 48px; max-width: 400px; }
    h2   { font-size: 22px; font-weight: 700; margin: 0 0 16px; }
    p    { font-size: 14px; line-height: 1.6; margin: 8px 0; }
    .dim { color: #666; font-size: 13px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>${title}</h2>
    ${body}
  </div>
</body>
</html>`
}

export default async function tiktokRoutes(app) {
  // Inicia OAuth — frontend abre esta rota em nova aba
  app.get('/tiktok/auth', async (req, reply) => {
    const { canal_id } = req.query
    if (!canal_id) return reply.code(400).send({ error: 'canal_id obrigatório' })

    const canal = db.prepare('SELECT * FROM canais WHERE id = ?').get(canal_id)
    if (!canal || canal.tipo !== 'tiktok') {
      return reply.code(404).send({ error: 'canal tiktok não encontrado' })
    }

    const config = JSON.parse(canal.config)
    if (!config.client_key) {
      return reply.code(400).send({ error: 'client_key não configurado no canal' })
    }

    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '')
    if (!publicUrl) {
      return reply.code(400).send({ error: 'PUBLIC_URL não configurada' })
    }

    const redirectUri = `${publicUrl}/tiktok/callback`

    const url = new URL(AUTH_URL)
    url.searchParams.set('client_key',     config.client_key)
    url.searchParams.set('scope',          SCOPE)
    url.searchParams.set('response_type',  'code')
    url.searchParams.set('redirect_uri',   redirectUri)
    url.searchParams.set('state',          String(canal_id))

    return reply.redirect(url.toString())
  })

  // Callback do OAuth — TikTok redireciona aqui
  app.get('/tiktok/callback', async (req, reply) => {
    const { code, state: canal_id, error: oauthErr, error_description } = req.query

    if (oauthErr) {
      return reply.type('text/html').send(
        page('Erro de autorização', `<p style="color:#e05555">${error_description || oauthErr}</p>`)
      )
    }

    if (!code || !canal_id) {
      return reply.type('text/html').send(page('Erro', '<p style="color:#e05555">Parâmetros inválidos.</p>'))
    }

    const canal = db.prepare('SELECT * FROM canais WHERE id = ?').get(canal_id)
    if (!canal) {
      return reply.type('text/html').send(page('Erro', '<p style="color:#e05555">Canal não encontrado.</p>'))
    }

    const config = JSON.parse(canal.config)
    const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '')
    const redirectUri = `${publicUrl}/tiktok/callback`

    try {
      // Troca código por tokens
      const { data: tokenData } = await axios.post(TOKEN_URL,
        new URLSearchParams({
          client_key:    config.client_key,
          client_secret: config.client_secret,
          code,
          grant_type:    'authorization_code',
          redirect_uri:  redirectUri
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      if (tokenData.error?.code && tokenData.error.code !== 'ok') {
        throw new Error(tokenData.error.message || JSON.stringify(tokenData.error))
      }

      const tokens = tokenData.data

      // Busca nome da conta
      let displayName = ''
      try {
        const { data: ui } = await axios.get(USERINFO_URL, {
          params:  { fields: 'open_id,display_name' },
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        })
        displayName = ui.data?.user?.display_name || ''
      } catch {}

      const newConfig = {
        ...config,
        access_token:     tokens.access_token,
        refresh_token:    tokens.refresh_token,
        open_id:          tokens.open_id,
        display_name:     displayName,
        token_expires_at: Date.now() + tokens.expires_in * 1000
      }

      db.prepare('UPDATE canais SET config = ? WHERE id = ?').run(JSON.stringify(newConfig), canal_id)

      const nome = displayName ? `@${displayName}` : `open_id: ${tokens.open_id}`
      return reply.type('text/html').send(page('Conectado!', `
        <p style="color:#c8f135;font-size:18px">✓ Conta conectada com sucesso</p>
        <p style="color:#aaa">${nome}</p>
        <p class="dim">Pode fechar esta aba e voltar ao instabot.</p>
      `))
    } catch (e) {
      return reply.type('text/html').send(
        page('Erro', `<p style="color:#e05555">${e.message}</p>`)
      )
    }
  })
}
