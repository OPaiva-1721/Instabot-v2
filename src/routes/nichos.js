import db from '../db/index.js'

export default async function nichosRoutes(app) {
  app.get('/nichos', async () => {
    return db.prepare('SELECT * FROM nichos ORDER BY nome').all()
  })

  app.post('/nichos', async (req, reply) => {
    const {
      nome, palavras_chave = '', desconto_minimo = 20,
      claude_tom = 'jovem e animado', claude_prompt_base = '', claude_hashtags_padrao = ''
    } = req.body ?? {}
    if (!nome) return reply.code(400).send({ error: 'nome obrigatório' })
    const result = db.prepare(`
      INSERT INTO nichos (nome, palavras_chave, desconto_minimo, claude_tom, claude_prompt_base, claude_hashtags_padrao)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(nome, palavras_chave, desconto_minimo, claude_tom, claude_prompt_base, claude_hashtags_padrao)
    return db.prepare('SELECT * FROM nichos WHERE id = ?').get(result.lastInsertRowid)
  })

  app.put('/nichos/:id', async (req, reply) => {
    const nicho = db.prepare('SELECT * FROM nichos WHERE id = ?').get(req.params.id)
    if (!nicho) return reply.code(404).send({ error: 'nicho não encontrado' })
    const { nome, palavras_chave, desconto_minimo, claude_tom, claude_prompt_base, claude_hashtags_padrao, ativo } = req.body ?? {}
    db.prepare(`
      UPDATE nichos SET nome = ?, palavras_chave = ?, desconto_minimo = ?,
        claude_tom = ?, claude_prompt_base = ?, claude_hashtags_padrao = ?, ativo = ?
      WHERE id = ?
    `).run(
      nome ?? nicho.nome,
      palavras_chave ?? nicho.palavras_chave,
      desconto_minimo ?? nicho.desconto_minimo,
      claude_tom ?? nicho.claude_tom,
      claude_prompt_base ?? nicho.claude_prompt_base,
      claude_hashtags_padrao ?? nicho.claude_hashtags_padrao,
      ativo !== undefined ? (ativo ? 1 : 0) : nicho.ativo,
      req.params.id
    )
    return db.prepare('SELECT * FROM nichos WHERE id = ?').get(req.params.id)
  })

  app.delete('/nichos/:id', async (req, reply) => {
    if (!db.prepare('SELECT id FROM nichos WHERE id = ?').get(req.params.id)) {
      return reply.code(404).send({ error: 'nicho não encontrado' })
    }
    db.prepare('DELETE FROM nichos WHERE id = ?').run(req.params.id)
    return { ok: true }
  })

  app.get('/nichos/:id/canais', async (req, reply) => {
    if (!db.prepare('SELECT id FROM nichos WHERE id = ?').get(req.params.id)) {
      return reply.code(404).send({ error: 'nicho não encontrado' })
    }
    return db.prepare(`
      SELECT c.* FROM canais c
      JOIN nicho_canais nc ON nc.canal_id = c.id
      WHERE nc.nicho_id = ?
      ORDER BY c.nome
    `).all(req.params.id)
  })

  app.post('/nichos/:id/canais/:canalId', async (req, reply) => {
    if (!db.prepare('SELECT id FROM nichos WHERE id = ?').get(req.params.id)) {
      return reply.code(404).send({ error: 'nicho não encontrado' })
    }
    if (!db.prepare('SELECT id FROM canais WHERE id = ?').get(req.params.canalId)) {
      return reply.code(404).send({ error: 'canal não encontrado' })
    }
    db.prepare('INSERT OR IGNORE INTO nicho_canais (nicho_id, canal_id) VALUES (?, ?)').run(req.params.id, req.params.canalId)
    return { ok: true }
  })

  app.delete('/nichos/:id/canais/:canalId', async (req, reply) => {
    db.prepare('DELETE FROM nicho_canais WHERE nicho_id = ? AND canal_id = ?').run(req.params.id, req.params.canalId)
    return { ok: true }
  })
}
