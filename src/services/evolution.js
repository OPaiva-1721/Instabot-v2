import axios from 'axios'
import { readFileSync } from 'fs'

export async function enviarParaGrupo(produto, config) {
  const { api_url, api_key, instance, grupo_id } = config

  const api = axios.create({
    baseURL: api_url,
    headers: { apikey: api_key }
  })

  const precoAntigo = produto.preco_antigo != null ? `R$${Number(produto.preco_antigo).toFixed(2)}` : '?'
  const precoNovo = produto.preco_novo != null ? `R$${Number(produto.preco_novo).toFixed(2)}` : '?'
  const link = produto.offer_link ?? ''
  const nome = produto.nome_limpo || produto.nome

  const linhas = []
  if (produto.hook) linhas.push(produto.hook, '')
  linhas.push(nome, '')
  linhas.push(`De: ${precoAntigo} | Por: ${precoNovo} pix 👑`, '')
  if (link) linhas.push(`Link: ${link}`)
  const texto = linhas.join('\n')

  if (!produto.imagem_path) throw new Error('imagem não encontrada')
  const media = readFileSync(produto.imagem_path).toString('base64')

  await api.post(`/message/sendMedia/${instance}`, {
    number: grupo_id,
    mediaMessage: {
      mediatype: 'image',
      mimetype: 'image/jpeg',
      fileName: 'produto.jpg',
      media,
      caption: texto
    }
  })
}
