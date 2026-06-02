import db from '../db/index.js'

export default async function canaisRoutes(app) {
  app.get('/canais', async (req) => {
    const { ativo } = req.query ?? {}
    if (ativo !== undefined) {
      return db.prepare('SELECT * FROM canais WHERE ativo = ? ORDER BY nome').all(Number(ativo))
    }
    return db.prepare('SELECT * FROM canais ORDER BY nome').all()
  })

  app.get('/canais/:id', async (req, reply) => {
    const canal = db.prepare('SELECT * FROM canais WHERE id = ?').get(req.params.id)
    if (!canal) return reply.code(404).send({ error: 'canal não encontrado' })
    return canal
  })

  app.post('/canais', async (req, reply) => {
    const { tipo, nome, config = {} } = req.body ?? {}
    if (!tipo || !nome) return reply.code(400).send({ error: 'tipo e nome obrigatórios' })
    if (!['instagram', 'whatsapp', 'telegram', 'tiktok'].includes(tipo)) return reply.code(400).send({ error: 'tipo inválido' })
    const result = db.prepare(
      'INSERT INTO canais (tipo, nome, config) VALUES (?, ?, ?)'
    ).run(tipo, nome, JSON.stringify(config))
    return db.prepare('SELECT * FROM canais WHERE id = ?').get(result.lastInsertRowid)
  })

  app.put('/canais/:id', async (req, reply) => {
    const canal = db.prepare('SELECT * FROM canais WHERE id = ?').get(req.params.id)
    if (!canal) return reply.code(404).send({ error: 'canal não encontrado' })
    const { nome, config, ativo } = req.body ?? {}
    db.prepare('UPDATE canais SET nome = ?, config = ?, ativo = ? WHERE id = ?').run(
      nome ?? canal.nome,
      config !== undefined ? JSON.stringify(config) : canal.config,
      ativo !== undefined ? (ativo ? 1 : 0) : canal.ativo,
      req.params.id
    )
    return db.prepare('SELECT * FROM canais WHERE id = ?').get(req.params.id)
  })

  app.delete('/canais/:id', async (req, reply) => {
    if (!db.prepare('SELECT id FROM canais WHERE id = ?').get(req.params.id)) {
      return reply.code(404).send({ error: 'canal não encontrado' })
    }
    db.prepare('DELETE FROM canais WHERE id = ?').run(req.params.id)
    return { ok: true }
  })
}
