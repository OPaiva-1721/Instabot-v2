import db from '../db/index.js'
import { revisarCopy } from '../agent/claude.js'
import { gerarParaProduto, publicarProduto, processarAutomatico } from '../services/pipeline.js'

export default async function routes(app) {

  app.addHook('onRequest', async (req, reply) => {
    const apiKey = process.env.API_KEY
    if (apiKey && req.headers['x-api-key'] !== apiKey) {
      return reply.code(401).send({ error: 'unauthorized' })
    }
  })

  app.get('/fila', async () => {
    return db.prepare(`
      SELECT p.*, n.nome as nicho_nome
      FROM produtos p
      LEFT JOIN nichos n ON n.id = p.nicho_id
      ORDER BY p.criado_em DESC LIMIT 50
    `).all()
  })

  app.get('/fila/:id', async (req) => {
    return db.prepare(`
      SELECT p.*, n.nome as nicho_nome
      FROM produtos p
      LEFT JOIN nichos n ON n.id = p.nicho_id
      WHERE p.id = ?
    `).get(req.params.id)
  })

  app.post('/fila/:id/gerar', async (req, reply) => {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id)
    if (!produto) return reply.code(404).send({ error: 'Produto não encontrado' })
    if (produto.status === 'aprovado') return reply.code(409).send({ error: 'produto já aprovado' })
    const nicho = produto.nicho_id ? db.prepare('SELECT * FROM nichos WHERE id = ?').get(produto.nicho_id) : null
    return gerarParaProduto(produto, nicho)
  })

  app.post('/fila/:id/revisar', async (req, reply) => {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id)
    if (!produto) return reply.code(404).send({ error: 'Produto não encontrado' })

    const { historico, pedido } = req.body ?? {}
    if (!Array.isArray(historico) || typeof pedido !== 'string') {
      return reply.code(400).send({ error: 'historico (array) e pedido (string) obrigatórios' })
    }

    const resultado = await revisarCopy(historico, pedido)
    db.prepare(`UPDATE produtos SET copy = ?, hashtags = ?, atualizado_em = datetime('now') WHERE id = ?`)
      .run(resultado.copy, resultado.hashtags.join(' '), produto.id)
    return resultado
  })

  app.post('/fila/:id/aprovar', async (req, reply) => {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id)
    if (!produto) return reply.code(404).send({ error: 'Produto não encontrado' })
    if (produto.status === 'aprovado') return reply.code(409).send({ error: 'produto já publicado' })

    const { canal_ids } = req.body ?? {}
    if (!Array.isArray(canal_ids) || canal_ids.length === 0) {
      return reply.code(400).send({ error: 'canal_ids (array não vazio) obrigatório' })
    }

    const canaisSelecionados = canal_ids
      .map(id => db.prepare('SELECT * FROM canais WHERE id = ?').get(id))
      .filter(Boolean)

    const precisaCopy   = canaisSelecionados.some(c => ['instagram', 'tiktok'].includes(c.tipo))
    const precisaImagem = canaisSelecionados.some(c => c.tipo !== 'whatsapp')

    if (precisaCopy && !produto.copy) {
      return reply.code(422).send({ error: 'gere o copy antes de aprovar' })
    }
    if (precisaImagem && !produto.imagem_path) {
      return reply.code(422).send({ error: 'gere a imagem antes de aprovar' })
    }

    return publicarProduto(produto, canal_ids)
  })

  app.post('/pipeline/processar-fila', async () => {
    const aguardando = db.prepare(`SELECT * FROM produtos WHERE status = 'aguardando' ORDER BY criado_em ASC`).all()
    if (aguardando.length === 0) return { processados: 0, resultados: [] }

    const resultados = []
    for (const produto of aguardando) {
      try {
        const r = await processarAutomatico(produto)
        resultados.push({ id: produto.id, ok: true, ...r })
      } catch (e) {
        resultados.push({ id: produto.id, ok: false, erro: e.message })
      }
    }
    return { processados: resultados.length, resultados }
  })

  app.get('/envios', async () => {
    return db.prepare(`
      SELECT e.*, p.nome, p.desconto, c.nome as canal_nome
      FROM envios e
      JOIN produtos p ON p.id = e.produto_id
      LEFT JOIN canais c ON c.id = e.canal_id
      ORDER BY e.enviado_em DESC LIMIT 100
    `).all()
  })
}
