import axios from 'axios'
import { readFileSync } from 'fs'

const BASE = 'https://api.telegram.org'

export async function enviarParaCanal(produto, config) {
  const { bot_token, chat_id } = config

  const precoAntigo = produto.preco_antigo != null ? `R$${Number(produto.preco_antigo).toFixed(2)}` : '?'
  const precoNovo = produto.preco_novo != null ? `R$${Number(produto.preco_novo).toFixed(2)}` : '?'
  const link = produto.offer_link ?? ''
  const nome = produto.nome_limpo || produto.nome

  const linhas = []
  if (produto.hook) linhas.push(`*${produto.hook}*`, '')
  linhas.push(nome, '')
  linhas.push(`De: ${precoAntigo} | Por: ${precoNovo} pix 👑`, '')
  if (link) linhas.push(`Link: ${link}`)
  const caption = linhas.join('\n').slice(0, 1024)

  if (!produto.imagem_path) throw new Error('imagem não encontrada')

  const fileBuffer = readFileSync(produto.imagem_path)
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' })

  const formData = new FormData()
  formData.append('chat_id', String(chat_id))
  formData.append('caption', caption)
  formData.append('parse_mode', 'Markdown')
  formData.append('photo', blob, 'produto.jpg')

  await axios.post(`${BASE}/bot${bot_token}/sendPhoto`, formData)
}
