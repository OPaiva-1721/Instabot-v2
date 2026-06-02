import { useState, useEffect } from 'react'
import { API } from '../lib/api.js'
import { useMobile } from '../hooks/useMobile.js'
import './WhatsApp.css'

export default function WhatsApp() {
  const [envios, setEnvios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [grupoAtivo, setGrupoAtivo] = useState(null)
  const [loadingGrupos, setLoadingGrupos] = useState(true)
  const [erroGrupos, setErroGrupos] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const mobile = useMobile()
  const [mobileView, setMobileView] = useState('list')

  const carregarGrupos = () => {
    setLoadingGrupos(true)
    setErroGrupos(null)
    const salvo = localStorage.getItem('wa_grupo_ativo')
    fetch(`${API}/whatsapp/grupos`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setGrupos(data)
        const inicial = salvo ? data.find(g => g.id === salvo) : null
        setGrupoAtivo(inicial ?? data[0] ?? null)
      })
      .catch(e => setErroGrupos(e.message))
      .finally(() => setLoadingGrupos(false))
  }

  useEffect(() => {
    carregarGrupos()
    fetch(`${API}/envios`)
      .then(r => r.json())
      .then(data => setEnvios(data.filter(e => e.canal === 'whatsapp')))
      .catch(() => {})
  }, [])

  const handleSelecionarGrupo = (g) => {
    setGrupoAtivo(g)
    localStorage.setItem('wa_grupo_ativo', g.id)
    if (mobile) setMobileView('detail')
  }

  const handleSincronizar = async () => {
    setSincronizando(true)
    setErroGrupos(null)
    try {
      const r = await fetch(`${API}/whatsapp/grupos/sincronizar`)
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      const salvo = localStorage.getItem('wa_grupo_ativo')
      setGrupos(data)
      const inicial = salvo ? data.find(g => g.id === salvo) : null
      setGrupoAtivo(inicial ?? data[0] ?? null)
    } catch (e) {
      setErroGrupos(e.message)
    } finally {
      setSincronizando(false)
    }
  }

  const handleToggleFavorito = async (g, e) => {
    e.stopPropagation()
    const r = await fetch(`${API}/whatsapp/grupos/${encodeURIComponent(g.id)}/favorito`, { method: 'POST' })
    const data = await r.json()
    setGrupos(prev => prev.map(x => x.id === g.id ? { ...x, favorito: data.favorito ? 1 : 0 } : x))
  }

  const enviosDoGrupo = grupoAtivo
    ? envios.filter(e => e.grupo_id === grupoAtivo.id).slice(0, 10)
    : []

  return (
    <div className="wa-page" data-view={mobile ? mobileView : undefined}>
      <aside className="wa-sidebar">
        <div className="wa-sidebar-header">
          <span className="wa-sidebar-title">grupos</span>
          <button
            className="wa-sync-btn"
            onClick={handleSincronizar}
            disabled={sincronizando}
            title="sincronizar grupos do WhatsApp"
          >
            {sincronizando ? '...' : '↺'}
          </button>
        </div>

        {loadingGrupos && <div className="wa-loading">carregando grupos...</div>}
        {erroGrupos && <div className="wa-erro">{erroGrupos}</div>}

        <div className="wa-group-list">
          {grupos.map(g => (
            <button
              key={g.id}
              className={`wa-group-item ${grupoAtivo?.id === g.id ? 'active' : ''}`}
              onClick={() => handleSelecionarGrupo(g)}
            >
              <div className="wa-group-avatar">
                {g.nome.charAt(0).toUpperCase()}
              </div>
              <div className="wa-group-info">
                <span className="wa-group-nome">{g.nome}</span>
                <span className="wa-group-membros">{g.membros} membros</span>
              </div>
              <button
                className={`wa-fav-btn ${g.favorito ? 'ativo' : ''}`}
                onClick={(e) => handleToggleFavorito(g, e)}
                title={g.favorito ? 'remover dos favoritos' : 'adicionar aos favoritos'}
              >
                {g.favorito ? '★' : '☆'}
              </button>
            </button>
          ))}
        </div>
      </aside>

      <div className="wa-main">
        {grupoAtivo ? (
          <>
            <div className="wa-header">
              {mobile && (
                <button className="btn-back" onClick={() => setMobileView('list')}>←</button>
              )}
              <div>
                <div className="wa-header-nome">{grupoAtivo.nome}</div>
                <div className="wa-header-meta">{grupoAtivo.membros} membros</div>
              </div>
            </div>

            <div className="wa-content">
              <div className="wa-history">
                <div className="wa-section-label">enviados neste grupo</div>
                {enviosDoGrupo.length === 0 ? (
                  <div className="wa-empty">nenhum envio para este grupo ainda</div>
                ) : (
                  enviosDoGrupo.map(e => (
                    <div key={e.id} className="wa-msg">
                      <div className="wa-msg-thumb" />
                      <div className="wa-msg-body">
                        <span className="wa-msg-produto">{e.nome}</span>
                        <span className="wa-msg-time">{e.enviado_em ?? 'aguardando'}</span>
                        <span className={`wa-msg-status ${e.status}`}>
                          {e.status === 'enviado' ? '✓ enviado' : e.status}
                        </span>
                        {e.erro && <span className="wa-msg-erro">{e.erro}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          !loadingGrupos && !erroGrupos && (
            <div className="wa-empty-state">
              {grupos.length === 0
                ? 'nenhum grupo cadastrado. clique em ↺ para sincronizar.'
                : 'selecione um grupo'}
            </div>
          )
        )}
      </div>
    </div>
  )
}
