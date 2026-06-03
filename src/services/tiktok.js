import axios from 'axios'
import db from '../db/index.js'

const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const POST_URL  = 'https://open.tiktokapis.com/v2/post/publish/content/init/'

async function refreshIfNeeded(canalId, config) {
  if (!config.token_expires_at || Date.now() < config.token_expires_at - 300_000) {
    return config
  }

  const { data } = await axios.post(TOKEN_URL,
    new URLSearchParams({
      client_key:    config.client_key,
      client_secret: config.client_secret,
      grant_type:    'refresh_token',
      refresh_token: config.refresh_token
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  if (data.error?.code && data.error.code !== 'ok') {
    throw new Error(`token refresh falhou: ${data.error.message}`)
  }

  const newConfig = {
    ...config,
    access_token:     data.data.access_token,
    refresh_token:    data.data.refresh_token ?? config.refresh_token,
    token_expires_at: Date.now() + data.data.expires_in * 1000
  }

  db.prepare('UPDATE canais SET config = ? WHERE id = ?').run(JSON.stringify(newConfig), canalId)
  return newConfig
}

function buildCaption(produto) {
  const precoAntigo = produto.preco_antigo != null ? `R$${Number(produto.preco_antigo).toFixed(2)}` : '?'
  const precoNovo   = produto.preco_novo   != null ? `R$${Number(produto.preco_novo).toFixed(2)}`   : '?'
  const nome = produto.nome_limpo || produto.nome
  const link = produto.offer_link ?? ''

  const linhas = []
  if (produto.hook) linhas.push(produto.hook, '')
  linhas.push(nome, '')
  linhas.push(`De: ${precoAntigo} | Por: ${precoNovo} pix 👑`, '')
  if (link) linhas.push(`Link: ${link}`)
  return linhas.join('\n')
}

export async function publicarPost(produto, imagemUrl, config, canalId) {
  if (!imagemUrl) throw new Error('PUBLIC_URL não configurada — TikTok requer URL pública da imagem')

  config = await refreshIfNeeded(canalId, config)

  const body = produto.copy
    ? `${produto.copy}\n\n${produto.hashtags}`.slice(0, 2200)
    : buildCaption(produto).slice(0, 2200)

  const nomeCurto = (produto.nome_limpo || produto.nome).slice(0, 90)

  let data
  try {
    ;({ data } = await axios.post(POST_URL,
      {
        post_info: {
          title:           nomeCurto,
          description:     body,
          privacy_level:   config.privacy_level || 'SELF_ONLY',
          disable_comment: false,
          auto_add_music:  true
        },
        source_info: {
          source:             'PULL_FROM_URL',
          photo_images:       [imagemUrl],
          photo_cover_index:  0
        },
        post_mode:  'DIRECT_POST',
        media_type: 'PHOTO'
      },
      {
        headers: {
          Authorization:  `Bearer ${config.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    ))
  } catch (e) {
    const detail = e.response?.data
    throw new Error(detail ? JSON.stringify(detail) : e.message)
  }

  if (data.error?.code && data.error.code !== 'ok') {
    throw new Error(data.error.message || JSON.stringify(data.error))
  }

  return data.data.publish_id
}
