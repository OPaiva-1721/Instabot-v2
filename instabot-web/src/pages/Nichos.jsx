import { useState, useEffect } from 'react'
import { API } from '../lib/api.js'
import { useMobile } from '../hooks/useMobile.js'
import './Nichos.css'

const TIPO_ICONS = { instagram: 'IG', whatsapp: 'WA' }
const TONS = ['jovem e animado', 'formal', 'neutro', 'urgente', 'feminino e descolado', 'masculino e direto']

export default function Nichos() {
  const [nichos, setNichos] = useState([])
  const [canaisTodos, setCanaisTodos] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [form, setForm] = useState(null)
  const [canaisAssociados, setCanaisAssociados] = useState(new Set())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const mobile = useMobile()
  const [mobileView, setMobileView] = useState('list')

  const carregarNichos = () => {
    fetch(`${API}/nichos`).then(r => r.json()).then(setNichos).catch(() => {})
  }

  useEffect(() => {
    carregarNichos()
    fetch(`${API}/canais`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCanaisTodos(data)
    }).catch(() => {})
  }, [])

  const carregarCanaisDoNicho = async (nichoId) => {
    const data = await fetch(`${API}/nichos/${nichoId}/canais`).then(r => r.json())
    setCanaisAssociados(new Set(Array.isArray(data) ? data.map(c => c.id) : []))
  }

  const novoNicho = () => {
    if (mobile) setMobileView('detail')
    setSelecionado(null)
    setForm({
      nome: '', palavras_chave: '', desconto_minimo: 20,
      claude_tom: 'jovem e animado', claude_prompt_base: '',
      claude_hashtags_padrao: '', ativo: 1
    })
    setCanaisAssociados(new Set())
    setErro(null)
  }

  const selecionar = async (nicho) => {
    setSelecionado(nicho)
    setForm({ ...nicho })
    await carregarCanaisDoNicho(nicho.id)
    setErro(null)
    if (mobile) setMobileView('detail')
  }

  const handleChange = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const toggleCanal = async (canalId) => {
    if (!selecionado) {
      setCanaisAssociados(prev => {
        const next = new Set(prev)
        next.has(canalId) ? next.delete(canalId) : next.add(canalId)
        return next
      })
      return
    }
    if (canaisAssociados.has(canalId)) {
      await fetch(`${API}/nichos/${selecionado.id}/canais/${canalId}`, { method: 'DELETE' })
      setCanaisAssociados(prev => { const n = new Set(prev); n.delete(canalId); return n })
    } else {
      await fetch(`${API}/nichos/${selecionado.id}/canais/${canalId}`, { method: 'POST' })
      setCanaisAssociados(prev => new Set([...prev, canalId]))
    }
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      let nicho
      if (selecionado) {
        const res = await fetch(`${API}/nichos/${selecionado.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        nicho = await res.json()
        if (nicho.error) throw new Error(nicho.error)
      } else {
        const res = await fetch(`${API}/nichos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        nicho = await res.json()
        if (nicho.error) throw new Error(nicho.error)
        for (const canalId of canaisAssociados) {
          await fetch(`${API}/nichos/${nicho.id}/canais/${canalId}`, { method: 'POST' })
        }
      }
      carregarNichos()
      setSelecionado(nicho)
      setForm({ ...nicho })
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!selecionado || !confirm(`Excluir nicho "${selecionado.nome}"?`)) return
    await fetch(`${API}/nichos/${selecionado.id}`, { method: 'DELETE' })
    carregarNichos()
    setSelecionado(null)
    setForm(null)
  }

  return (
    <div className="nichos-page" data-view={mobile ? mobileView : undefined}>
      <aside className="nichos-sidebar">
        <div className="nichos-sidebar-header">
          <span className="nichos-sidebar-title">nichos</span>
          <button className="nichos-novo-btn" onClick={novoNicho} title="novo nicho">+</button>
        </div>

        <div className="nichos-list">
          {nichos.length === 0 && (
            <div className="nichos-empty-sidebar">nenhum nicho. clique em + para criar.</div>
          )}
          {nichos.map(n => (
            <button
              key={n.id}
              className={`nicho-item ${selecionado?.id === n.id ? 'active' : ''}`}
              onClick={() => selecionar(n)}
            >
              <div className="nicho-info">
                <span className="nicho-nome">{n.nome}</span>
                <span className="nicho-kw">{n.palavras_chave || 'sem palavras-chave'}</span>
              </div>
              <div className={`nicho-dot ${n.ativo ? 'ativo' : ''}`} />
            </button>
          ))}
        </div>
      </aside>

      <div className="nichos-main">
        {form ? (
          <div className="nichos-form-wrap">
            <div className="nichos-form-header">
              {mobile && (
                <button className="btn-back" onClick={() => { setSelecionado(null); setForm(null); setMobileView('list') }}>←</button>
              )}
              <div className="nichos-form-title">
                {selecionado ? `editar — ${selecionado.nome}` : 'novo nicho'}
              </div>
              {selecionado && (
                <button className="nf-btn-danger" onClick={handleExcluir}>excluir</button>
              )}
            </div>

            <div className="nichos-form">
              <div className="nf-section-label">configuração básica</div>

              <div className="nf-field">
                <label className="nf-label">nome</label>
                <input className="nf-input" value={form.nome} onChange={e => handleChange('nome', e.target.value)} placeholder="ex: Moda Feminina" />
              </div>

              <div className="nf-field">
                <label className="nf-label">palavras-chave</label>
                <input className="nf-input" value={form.palavras_chave} onChange={e => handleChange('palavras_chave', e.target.value)} placeholder="vestido,blusa,saia,calça" />
                <span className="nf-hint">separadas por vírgula — produto entra neste nicho se o nome contiver qualquer uma</span>
              </div>

              <div className="nf-field nf-field-sm">
                <label className="nf-label">desconto mínimo (%)</label>
                <input className="nf-input" type="number" value={form.desconto_minimo} min={0} max={100} onChange={e => handleChange('desconto_minimo', Number(e.target.value))} />
              </div>

              <div className="nf-section-label" style={{ marginTop: 8 }}>agente ia</div>

              <div className="nf-field">
                <label className="nf-label">tom de escrita</label>
                <select className="nf-input" value={form.claude_tom} onChange={e => handleChange('claude_tom', e.target.value)}>
                  {TONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div className="nf-field">
                <label className="nf-label">hashtags fixas</label>
                <input className="nf-input" value={form.claude_hashtags_padrao} onChange={e => handleChange('claude_hashtags_padrao', e.target.value)} placeholder="#moda #shopee #oferta" />
                <span className="nf-hint">separadas por espaço</span>
              </div>

              <div className="nf-field">
                <label className="nf-label">prompt base do agente</label>
                <textarea className="nf-textarea" value={form.claude_prompt_base} onChange={e => handleChange('claude_prompt_base', e.target.value)} placeholder="Você é um especialista em marketing de moda para Instagram brasileiro..." rows={4} />
                <span className="nf-hint">deixe em branco para usar o prompt global das configurações</span>
              </div>

              <div className="nf-section-label" style={{ marginTop: 8 }}>canais de publicação</div>

              {canaisTodos.length === 0 ? (
                <div className="nf-hint">nenhum canal configurado. acesse Canais para criar.</div>
              ) : (
                <div className="nf-canais-list">
                  {canaisTodos.map(c => (
                    <label key={c.id} className="nf-canal-check">
                      <input
                        type="checkbox"
                        checked={canaisAssociados.has(c.id)}
                        onChange={() => toggleCanal(c.id)}
                      />
                      <span className={`nf-canal-badge ${c.tipo}`}>{TIPO_ICONS[c.tipo]}</span>
                      <span className="nf-canal-nome">{c.nome}</span>
                      {!c.ativo && <span className="nf-canal-inativo">inativo</span>}
                    </label>
                  ))}
                </div>
              )}

              {erro && <div className="nf-erro">{erro}</div>}

              <div className="nf-footer">
                <button className="nf-btn-secondary" onClick={() => { setSelecionado(null); setForm(null) }}>cancelar</button>
                <button className="nf-btn-primary" onClick={handleSalvar} disabled={salvando || !form.nome}>
                  {salvando ? 'salvando...' : '✓ salvar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="nichos-empty-state">
            {nichos.length === 0
              ? 'crie seu primeiro nicho clicando em + na barra lateral'
              : 'selecione um nicho para editar'}
          </div>
        )}
      </div>
    </div>
  )
}
