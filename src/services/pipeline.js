import db from '../db/index.js'
import { gerarCopy } from '../agent/claude.js'
import { processarImagem } from '../agent/image.js'
import { publicarPost } from './instagram.js'
import { enviarParaGrupo } from './evolution.js'
import { enviarParaCanal } from './telegram.js'
import { publicarPost as publicarTiktok } from './tiktok.js'

const atualizarProduto = db.prepare(`
  UPDATE produtos SET status = @status, copy = @copy, hashtags = @hashtags,
  hook = @hook, nome_limpo = @nome_limpo, imagem_path = @imagem_path, atualizado_em = datetime('now') WHERE id = @id
`)

const registrarEnvio = db.prepare(`
  INSERT INTO envios (produto_id, canal_id, canal, status, grupo_id, erro, enviado_em)
  VALUES (@produto_id, @canal_id, @canal, @status, @grupo_id, @erro, datetime('now'))
`)

const atualizarStatus = db.prepare(`UPDATE produtos SET status = ?, atualizado_em = datetime('now') WHERE id = ?`)
const atualizarImagem = db.prepare(`UPDATE produtos SET imagem_path = ?, atualizado_em = datetime('now') WHERE id = ?`)

export async function gerarParaProduto(produto, nicho = null) {
  const [resultado, imagemPath] = await Promise.all([
    gerarCopy(produto, nicho),
    processarImagem(produto)
  ])

  atualizarProduto.run({
    '@id': produto.id,
    '@status': 'gerado',
    '@copy': resultado.copy,
    '@hashtags': resultado.hashtags.join(' '),
    '@hook': resultado.hook ?? '',
    '@nome_limpo': resultado.nome_limpo ?? '',
    '@imagem_path': imagemPath
  })

  const salvo = db.prepare('SELECT * FROM produtos WHERE id = ?').get(produto.id)
  if (!salvo.copy) throw new Error('falha ao salvar copy no banco')

  return salvo
}

export async function publicarProduto(produto, canalIds) {
  if (!produto.imagem_path) {
    const imagemPath = await processarImagem(produto)
    atualizarImagem.run(imagemPath, produto.id)
    produto = { ...produto, imagem_path: imagemPath }
  }

  const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '')
  const imagemUrl = publicUrl ? `${publicUrl}/images/${produto.id}.jpg` : null

  const canais = canalIds
    .map(id => db.prepare('SELECT * FROM canais WHERE id = ?').get(id))
    .filter(Boolean)

  const tarefas = canais.map(canal => {
    const config = JSON.parse(canal.config)

    if (canal.tipo === 'instagram') {
      if (!imagemUrl) {
        return Promise.resolve([canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: 'PUBLIC_URL não configurada' }])
      }
      return publicarPost(produto, imagemUrl, config)
        .then(postId => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'instagram', '@status': 'enviado', '@grupo_id': null, '@erro': null })
          return [canal.id, { ok: true, nome: canal.nome, tipo: canal.tipo, postId }]
        })
        .catch(e => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'instagram', '@status': 'erro', '@grupo_id': null, '@erro': e.message })
          return [canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: e.message }]
        })
    }

    if (canal.tipo === 'whatsapp') {
      return enviarParaGrupo(produto, config)
        .then(() => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'whatsapp', '@status': 'enviado', '@grupo_id': config.grupo_id ?? null, '@erro': null })
          return [canal.id, { ok: true, nome: canal.nome, tipo: canal.tipo }]
        })
        .catch(e => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'whatsapp', '@status': 'erro', '@grupo_id': config.grupo_id ?? null, '@erro': e.message })
          return [canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: e.message }]
        })
    }

    if (canal.tipo === 'tiktok') {
      if (!imagemUrl) {
        return Promise.resolve([canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: 'PUBLIC_URL não configurada' }])
      }
      return publicarTiktok(produto, imagemUrl, config, canal.id)
        .then(publishId => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'tiktok', '@status': 'enviado', '@grupo_id': null, '@erro': null })
          return [canal.id, { ok: true, nome: canal.nome, tipo: canal.tipo, publishId }]
        })
        .catch(e => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'tiktok', '@status': 'erro', '@grupo_id': null, '@erro': e.message })
          return [canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: e.message }]
        })
    }

    if (canal.tipo === 'telegram') {
      return enviarParaCanal(produto, config)
        .then(() => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'telegram', '@status': 'enviado', '@grupo_id': config.chat_id ?? null, '@erro': null })
          return [canal.id, { ok: true, nome: canal.nome, tipo: canal.tipo }]
        })
        .catch(e => {
          registrarEnvio.run({ '@produto_id': produto.id, '@canal_id': canal.id, '@canal': 'telegram', '@status': 'erro', '@grupo_id': config.chat_id ?? null, '@erro': e.message })
          return [canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: e.message }]
        })
    }

    return Promise.resolve([canal.id, { ok: false, nome: canal.nome, tipo: canal.tipo, erro: `tipo desconhecido: ${canal.tipo}` }])
  })

  const pares = await Promise.all(tarefas)
  const resultados = Object.fromEntries(pares)

  const algumOk = Object.values(resultados).some(r => r.ok)
  atualizarStatus.run(algumOk ? 'aprovado' : 'erro', produto.id)

  return resultados
}

export async function processarAutomatico(produto) {
  const nicho = produto.nicho_id
    ? db.prepare('SELECT * FROM nichos WHERE id = ?').get(produto.nicho_id)
    : null

  const canalIds = nicho
    ? db.prepare(`
        SELECT nc.canal_id FROM nicho_canais nc
        JOIN canais c ON c.id = nc.canal_id
        WHERE nc.nicho_id = ? AND c.ativo = 1
      `).all(nicho.id).map(r => r.canal_id)
    : []

  if (canalIds.length === 0) {
    console.log(`[pipeline] produto ${produto.id} sem canais, pulando auto-publish`)
    return { skipped: true }
  }

  const gerado = await gerarParaProduto(produto, nicho)
  return publicarProduto({ ...produto, ...gerado }, canalIds)
}
