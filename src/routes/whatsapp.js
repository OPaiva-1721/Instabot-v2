import axios from 'axios'
import db from '../db/index.js'

const upsertGrupo = db.prepare(`
  INSERT INTO grupos_wpp (id, nome, membros) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET nome = excluded.nome, membros = excluded.membros
`)

export default async function whatsappRoutes(app) {
  app.get('/whatsapp/grupos', async (req, reply) => {
    const favoritos = db.prepare('SELECT * FROM grupos_wpp WHERE favorito = 1 ORDER BY nome').all()
    if (favoritos.length > 0) return favoritos

    const todos = db.prepare('SELECT * FROM grupos_wpp ORDER BY nome').all()
    if (todos.length > 0) return todos

    return reply.code(404).send({ error: 'nenhum grupo cadastrado. sincronize na página WhatsApp.' })
  })

  app.get('/whatsapp/grupos/sincronizar', async (req, reply) => {
    const url = process.env.EVOLUTION_API_URL
    const key = process.env.EVOLUTION_API_KEY
    const instance = process.env.EVOLUTION_INSTANCE

    if (!url || !instance) {
      return reply.code(500).send({ error: 'Evolution API não configurada' })
    }

    try {
      const { data } = await axios.get(
        `${url}/group/fetchAllGroups/${instance}`,
        { headers: { apikey: key }, params: { getParticipants: false } }
      )
      const lista = Array.isArray(data) ? data : []
      for (const g of lista) {
        upsertGrupo.run(g.id, g.subject ?? g.id, g.size ?? 0)
      }
      return db.prepare('SELECT * FROM grupos_wpp ORDER BY nome').all()
    } catch (e) {
      return reply.code(500).send({ error: e.response?.data?.message ?? e.message })
    }
  })

  app.post('/whatsapp/grupos/:id/favorito', async (req, reply) => {
    const grupo = db.prepare('SELECT * FROM grupos_wpp WHERE id = ?').get(req.params.id)
    if (!grupo) return reply.code(404).send({ error: 'grupo não encontrado' })
    const novo = grupo.favorito ? 0 : 1
    db.prepare('UPDATE grupos_wpp SET favorito = ? WHERE id = ?').run(novo, req.params.id)
    return { id: req.params.id, favorito: novo === 1 }
  })
}
