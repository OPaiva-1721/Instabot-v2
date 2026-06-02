import { useState, useEffect, useRef } from 'react'
import { API } from '../lib/api.js'
import { useMobile } from '../hooks/useMobile.js'
import './Canais.css'

const TIPO_ICONS = { instagram: 'IG', whatsapp: 'WA', telegram: 'TG', tiktok: 'TK' }

function configPadrao(tipo) {
  if (tipo === 'instagram') return { account_id: '', access_token: '' }
  if (tipo === 'telegram')  return { bot_token: '', chat_id: '' }
  if (tipo === 'tiktok')    return { client_key: '', client_secret: '', privacy_level: 'PUBLIC_TO_EVERYONE' }
  return { api_url: '', api_key: '', instance: '', grupo_id: '' }
}

export default function Canais() {
  const [canais, setCanais] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [gruposWpp, setGruposWpp] = useState([])
  const [aguardandoAuth, setAguardandoAuth] = useState(false)
  const pollRef = useRef(null)
  const mobile = useMobile()
  const [mobileView, setMobileView] = useState('list')

  const carregar = () => {
    fetch(`${API}/canais`).then(r => r.json()).then(setCanais).catch(() => {})
  }

  useEffect(() => {
    carregar()
    fetch(`${API}/whatsapp/grupos`)
      .then(r => r.json())
      .then(data => { if (!data.error) setGruposWpp(data) })
      .catch(() => {})
    return () => clearInterval(pollRef.current)
  }, [])

  const novoCanal = (tipo) => {
    setSelecionado(null)
    setForm({ tipo, nome: '', ativo: 1, config: configPadrao(tipo) })
    setErro(null)
    setAguardandoAuth(false)
    clearInterval(pollRef.current)
    if (mobile) setMobileView('detail')
  }

  const selecionar = (canal) => {
    setSelecionado(canal)
    setForm({ ...canal, config: JSON.parse(canal.config) })
    setErro(null)
    setAguardandoAuth(false)
    clearInterval(pollRef.current)
    if (mobile) setMobileView('detail')
  }

  const handleChange = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const handleConfig = (key, value) => setForm(f => ({ ...f, config: { ...f.config, [key]: value } }))

  const handleSalvar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const body = { nome: form.nome, config: form.config }
      let res
      if (selecionado) {
        res = await fetch(`${API}/canais/${selecionado.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, ativo: form.ativo })
        })
      } else {
        res = await fetch(`${API}/canais`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: form.tipo, ...body })
        })
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      carregar()
      setSelecionado(data)
      setForm({ ...data, config: JSON.parse(data.config) })
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!selecionado || !confirm(`Excluir canal "${selecionado.nome}"?`)) return
    clearInterval(pollRef.current)
    await fetch(`${API}/canais/${selecionado.id}`, { method: 'DELETE' })
    carregar()
    setSelecionado(null)
    setForm(null)
  }

  const handleToggleAtivo = async (canal, e) => {
    e.stopPropagation()
    await fetch(`${API}/canais/${canal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !canal.ativo })
    })
    carregar()
  }

  // TikTok OAuth
  const handleConectarTiktok = () => {
    if (!selecionado) return
    window.open(`${API}/tiktok/auth?canal_id=${selecionado.id}`, '_blank', 'width=600,height=700')
    setAguardandoAuth(true)

    // Poll até token aparecer (máx 3 min)
    let tries = 0
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      tries++
      if (tries > 60) { clearInterval(pollRef.current); return }
      try {
        const data = await fetch(`${API}/canais/${selecionado.id}`).then(r => r.json())
        const cfg = JSON.parse(data.config)
        if (cfg.access_token) {
          setForm(f => ({ ...f, config: cfg }))
          setSelecionado(data)
          setAguardandoAuth(false)
          clearInterval(pollRef.current)
          carregar()
        }
      } catch {}
    }, 3000)
  }

  return (
    <div className="canais-page" data-view={mobile ? mobileView : undefined}>
      <aside className="canais-sidebar">
        <div className="canais-sidebar-header">
          <span className="canais-sidebar-title">canais</span>
          <div className="canais-novo-btns">
            <button className="canal-novo-btn instagram" onClick={() => novoCanal('instagram')} title="novo canal Instagram">IG</button>
            <button className="canal-novo-btn whatsapp"  onClick={() => novoCanal('whatsapp')}  title="novo canal WhatsApp">WA</button>
            <button className="canal-novo-btn telegram"  onClick={() => novoCanal('telegram')}  title="novo canal Telegram">TG</button>
            <button className="canal-novo-btn tiktok"    onClick={() => novoCanal('tiktok')}    title="novo canal TikTok">TK</button>
          </div>
        </div>

        <div className="canais-list">
          {canais.length === 0 && (
            <div className="canais-empty-sidebar">nenhum canal. clique nos botões acima para criar.</div>
          )}
          {canais.map(c => (
            <button
              key={c.id}
              className={`canal-item ${selecionado?.id === c.id ? 'active' : ''}`}
              onClick={() => selecionar(c)}
            >
              <div className={`canal-tipo-badge ${c.tipo}`}>{TIPO_ICONS[c.tipo] ?? c.tipo.slice(0,2).toUpperCase()}</div>
              <div className="canal-info">
                <span className="canal-nome">{c.nome}</span>
                <span className="canal-tipo-label">{c.tipo}</span>
              </div>
              <div
                className={`canal-status-dot ${c.ativo ? 'ativo' : ''}`}
                onClick={e => handleToggleAtivo(c, e)}
                title={c.ativo ? 'ativo — clique para desativar' : 'inativo — clique para ativar'}
              />
            </button>
          ))}
        </div>
      </aside>

      <div className="canais-main">
        {form ? (
          <div className="canais-form-wrap">
            <div className="canais-form-header">
              {mobile && (
                <button className="btn-back" onClick={() => { setSelecionado(null); setForm(null); setMobileView('list') }}>←</button>
              )}
              <div className="canais-form-title">
                {selecionado ? `editar — ${selecionado.nome}` : `novo canal ${form.tipo}`}
              </div>
              {selecionado && (
                <button className="cf-btn-danger" onClick={handleExcluir}>excluir</button>
              )}
            </div>

            <div className="canais-form">
              <div className="cf-field">
                <label className="cf-label">nome do canal</label>
                <input
                  className="cf-input"
                  value={form.nome}
                  onChange={e => handleChange('nome', e.target.value)}
                  placeholder={
                    form.tipo === 'instagram' ? 'ex: Instagram Moda' :
                    form.tipo === 'telegram'  ? 'ex: Canal TG Moda'  :
                    form.tipo === 'tiktok'    ? 'ex: TikTok Moda'    :
                    'ex: Grupo WPP Moda'
                  }
                />
              </div>

              {form.tipo === 'instagram' && <>
                <div className="cf-field">
                  <label className="cf-label">account id</label>
                  <input className="cf-input" value={form.config.account_id || ''} onChange={e => handleConfig('account_id', e.target.value)} placeholder="17841400000000000" />
                </div>
                <div className="cf-field">
                  <label className="cf-label">access token</label>
                  <input className="cf-input" type="password" value={form.config.access_token || ''} onChange={e => handleConfig('access_token', e.target.value)} placeholder="EAAB..." />
                </div>
              </>}

              {form.tipo === 'telegram' && <>
                <div className="cf-field">
                  <label className="cf-label">bot token</label>
                  <input className="cf-input" type="password" value={form.config.bot_token || ''} onChange={e => handleConfig('bot_token', e.target.value)} placeholder="123456:ABCdef..." />
                  <span className="cf-hint">obtenha em @BotFather no Telegram</span>
                </div>
                <div className="cf-field">
                  <label className="cf-label">chat id / canal</label>
                  <input className="cf-input" value={form.config.chat_id || ''} onChange={e => handleConfig('chat_id', e.target.value)} placeholder="-100123456789 ou @meucanal" />
                  <span className="cf-hint">grupo: número negativo. canal público: @username. use @userinfobot para descobrir o id.</span>
                </div>
              </>}

              {form.tipo === 'tiktok' && <>
                <div className="cf-field">
                  <label className="cf-label">client key</label>
                  <input className="cf-input" value={form.config.client_key || ''} onChange={e => handleConfig('client_key', e.target.value)} placeholder="aw..." />
                  <span className="cf-hint">developers.tiktok.com → seu app → Client Key</span>
                </div>
                <div className="cf-field">
                  <label className="cf-label">client secret</label>
                  <input className="cf-input" type="password" value={form.config.client_secret || ''} onChange={e => handleConfig('client_secret', e.target.value)} placeholder="..." />
                </div>
                <div className="cf-field">
                  <label className="cf-label">privacidade do post</label>
                  <select className="cf-input" value={form.config.privacy_level || 'PUBLIC_TO_EVERYONE'} onChange={e => handleConfig('privacy_level', e.target.value)}>
                    <option value="PUBLIC_TO_EVERYONE">público</option>
                    <option value="MUTUAL_FOLLOW_FRIENDS">amigos mútuos</option>
                    <option value="FOLLOWER_OF_CREATOR">seguidores</option>
                    <option value="SELF_ONLY">só eu (teste)</option>
                  </select>
                </div>

                {selecionado && (
                  <div className="cf-tiktok-auth">
                    <div className={`cf-tiktok-status ${form.config.access_token ? 'conectado' : ''}`}>
                      {form.config.access_token
                        ? `✓ conectado${form.config.display_name ? ` como @${form.config.display_name}` : ''}`
                        : 'conta não conectada'}
                    </div>
                    <button
                      className="cf-btn-tiktok"
                      onClick={handleConectarTiktok}
                      disabled={!form.config.client_key || !form.config.client_secret || aguardandoAuth}
                    >
                      {aguardandoAuth
                        ? 'aguardando autorização...'
                        : form.config.access_token ? 'reconectar conta' : 'conectar conta TikTok'}
                    </button>
                    {aguardandoAuth && (
                      <span className="cf-hint">authorize o app no TikTok — esta página detecta automaticamente quando conectar</span>
                    )}
                    {!form.config.client_key && (
                      <span className="cf-hint">preencha client key e secret e salve antes de conectar</span>
                    )}
                  </div>
                )}
                {!selecionado && (
                  <span className="cf-hint">salve o canal primeiro para depois conectar a conta TikTok</span>
                )}
              </>}

              {form.tipo === 'whatsapp' && <>
                <div className="cf-field">
                  <label className="cf-label">url da evolution api</label>
                  <input className="cf-input" value={form.config.api_url || ''} onChange={e => handleConfig('api_url', e.target.value)} placeholder="https://evolution.exemplo.com" />
                </div>
                <div className="cf-field">
                  <label className="cf-label">api key</label>
                  <input className="cf-input" type="password" value={form.config.api_key || ''} onChange={e => handleConfig('api_key', e.target.value)} placeholder="chave de acesso" />
                </div>
                <div className="cf-field">
                  <label className="cf-label">instância</label>
                  <input className="cf-input" value={form.config.instance || ''} onChange={e => handleConfig('instance', e.target.value)} placeholder="minha-instancia" />
                </div>
                <div className="cf-field">
                  <label className="cf-label">grupo</label>
                  {gruposWpp.length > 0
                    ? <select className="cf-input" value={form.config.grupo_id || ''} onChange={e => handleConfig('grupo_id', e.target.value)}>
                        <option value="">— selecione —</option>
                        {gruposWpp.map(g => <option key={g.id} value={g.id}>{g.nome} ({g.membros} membros)</option>)}
                      </select>
                    : <input className="cf-input" value={form.config.grupo_id || ''} onChange={e => handleConfig('grupo_id', e.target.value)} placeholder="120363...@g.us" />
                  }
                  <span className="cf-hint">sincronize grupos na página WhatsApp para ver a lista</span>
                </div>
              </>}

              {selecionado && (
                <div className="cf-field cf-field-inline">
                  <label className="cf-label">status</label>
                  <button
                    className={`cf-toggle ${form.ativo ? 'ativo' : ''}`}
                    onClick={() => handleChange('ativo', form.ativo ? 0 : 1)}
                  >
                    {form.ativo ? 'ativo' : 'inativo'}
                  </button>
                </div>
              )}

              {erro && <div className="cf-erro">{erro}</div>}

              <div className="cf-footer">
                <button className="cf-btn-secondary" onClick={() => { setSelecionado(null); setForm(null) }}>cancelar</button>
                <button className="cf-btn-primary" onClick={handleSalvar} disabled={salvando || !form.nome}>
                  {salvando ? 'salvando...' : '✓ salvar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="canais-empty-state">
            {canais.length === 0
              ? 'crie um canal usando os botões na barra lateral'
              : 'selecione um canal para editar'}
          </div>
        )}
      </div>
    </div>
  )
}
