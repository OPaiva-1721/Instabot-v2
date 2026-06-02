import { useState, useEffect, useCallback, useRef } from 'react'
import { API } from '../lib/api.js'
import './Settings.css'

const SECTIONS = ['shopee', 'geral', 'agente ia', 'pipeline', 'imagem']

const CAMPOS_POR_SECAO = {
  shopee: ['SHOPEE_APP_ID', 'SHOPEE_SECRET', 'DESCONTO_MINIMO'],
  geral: ['PUBLIC_URL', 'PORT', 'API_KEY'],
  'agente ia': ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'CLAUDE_TOM', 'CLAUDE_HASHTAGS_PADRAO', 'CLAUDE_PROMPT_BASE'],
  pipeline: ['AUTO_PUBLISH'],
  imagem: [],
}

export default function Settings() {
  const [active, setActive] = useState('shopee')
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState(null)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [logoMsg, setLogoMsg] = useState(null)
  const logoInputRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/settings/logo`)
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (!blob) return
        setLogoUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return URL.createObjectURL(blob)
        })
      })
      .catch(() => null)
  }, [])

  useEffect(() => () => { if (logoUrl) URL.revokeObjectURL(logoUrl) }, [logoUrl])

  const handleLogoUpload = useCallback(async () => {
    if (!logoFile) return
    setEnviandoLogo(true)
    setLogoMsg(null)
    const form = new FormData()
    form.append('logo', logoFile)
    try {
      const res = await fetch(`${API}/settings/logo`, { method: 'POST', body: form })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Erro ao enviar')
      const blob = await fetch(`${API}/settings/logo`).then(r => r.blob())
      setLogoUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
      setLogoMsg('Logo salva!')
      setLogoFile(null)
      if (logoInputRef.current) logoInputRef.current.value = ''
      setTimeout(() => setLogoMsg(null), 2500)
    } catch (e) {
      setLogoMsg(`Erro: ${e.message}`)
    } finally {
      setEnviandoLogo(false)
    }
  }, [logoFile])

  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(data => {
        const inicial = {}
        for (const [k, v] of Object.entries(data)) {
          inicial[k] = v.value
        }
        setValores(inicial)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = useCallback((key, value) => {
    setValores(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = async () => {
    setSalvando(true)
    setErro(null)
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valores)
      })
      const data = await res.json()
      if (!data.ok) throw new Error('Erro ao salvar')
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleCancel = () => {
    setLoading(true)
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(data => {
        const inicial = {}
        for (const [k, v] of Object.entries(data)) inicial[k] = v.value
        setValores(inicial)
      })
      .finally(() => setLoading(false))
  }

  const configurado = (secao) => {
    const opcionais = ['DESCONTO_MINIMO', 'CLAUDE_MODEL', 'CLAUDE_TOM', 'CLAUDE_HASHTAGS_PADRAO', 'CLAUDE_PROMPT_BASE', 'PORT', 'API_KEY']
    return CAMPOS_POR_SECAO[secao]
      .filter(k => !opcionais.includes(k))
      .every(k => !!valores[k])
  }

  if (loading) return <div className="settings-page" style={{ padding: 28, color: 'var(--muted)' }}>carregando...</div>

  return (
    <div className="settings-page">
      <nav className="settings-nav">
        {SECTIONS.map(s => (
          <button
            key={s}
            className={`settings-nav-item ${active === s ? 'active' : ''}`}
            onClick={() => setActive(s)}
          >
            {s}
          </button>
        ))}
      </nav>

      <div className="settings-main">
        {active === 'shopee' && (
          <Section title="Shopee — API de afiliados">
            <Field label="App ID" envKey="SHOPEE_APP_ID" placeholder="ex: 123456789" valores={valores} onChange={handleChange} />
            <Field label="Secret" envKey="SHOPEE_SECRET" placeholder="chave secreta" type="password" valores={valores} onChange={handleChange} />
            <Row>
              <Field label="Desconto mínimo global (%)" envKey="DESCONTO_MINIMO" placeholder="20" type="number" hint="fallback quando produto não pertence a nenhum nicho" valores={valores} onChange={handleChange} />
            </Row>
            <StatusBadge ok={configurado('shopee')} label={configurado('shopee') ? 'configurado' : 'não configurado'} />
          </Section>
        )}

        {active === 'geral' && (
          <Section title="Geral">
            <Field
              label="URL pública do backend"
              envKey="PUBLIC_URL"
              placeholder="https://seu-dominio.com ou ngrok URL"
              hint="Necessária para o Instagram baixar a imagem."
              valores={valores}
              onChange={handleChange}
            />
            <Row>
              <Field label="Porta" envKey="PORT" placeholder="3000" type="number" valores={valores} onChange={handleChange} />
              <Field label="API Key (autenticação)" envKey="API_KEY" placeholder="chave para proteger a API" type="password" valores={valores} onChange={handleChange} />
            </Row>
          </Section>
        )}

        {active === 'agente ia' && (
          <Section title="Agente IA — Claude (padrão global)">
            <Field label="API Key (Anthropic)" envKey="ANTHROPIC_API_KEY" placeholder="sk-ant-..." type="password" valores={valores} onChange={handleChange} />
            <Row>
              <Field
                label="Modelo"
                envKey="CLAUDE_MODEL"
                type="select"
                options={['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-7']}
                valores={valores}
                onChange={handleChange}
              />
              <Field
                label="Tom padrão"
                envKey="CLAUDE_TOM"
                type="select"
                options={['jovem e animado', 'formal', 'neutro', 'urgente']}
                valores={valores}
                onChange={handleChange}
              />
            </Row>
            <Field
              label="Hashtags padrão"
              envKey="CLAUDE_HASHTAGS_PADRAO"
              placeholder="#shopee #desconto #oferta"
              hint="separadas por espaço — cada nicho pode sobrescrever"
              valores={valores}
              onChange={handleChange}
            />
            <Field
              label="Prompt base padrão"
              envKey="CLAUDE_PROMPT_BASE"
              type="textarea"
              placeholder="Você é um especialista em marketing para Instagram brasileiro..."
              hint="cada nicho pode sobrescrever"
              valores={valores}
              onChange={handleChange}
            />
            <StatusBadge ok={!!valores['ANTHROPIC_API_KEY']} label={valores['ANTHROPIC_API_KEY'] ? 'configurado' : 'não configurado'} />
          </Section>
        )}

        {active === 'pipeline' && (
          <Section title="Pipeline automático">
            <Field
              label="Publicar automaticamente ao scraper"
              envKey="AUTO_PUBLISH"
              type="select"
              options={['false', 'true']}
              hint="quando ativo, produtos com nicho e canais configurados são publicados sem aprovação manual"
              valores={valores}
              onChange={handleChange}
            />
            <StatusBadge
              ok={valores['AUTO_PUBLISH'] === 'true'}
              label={valores['AUTO_PUBLISH'] === 'true' ? 'automático ativo' : 'manual (desativado)'}
            />
          </Section>
        )}

        {active === 'imagem' && (
          <Section title="Imagem — Logo da marca">
            <div className="field">
              <label className="field-label">Logo atual</label>
              {logoUrl
                ? <img src={logoUrl} alt="logo" style={{ maxHeight: 80, maxWidth: 200, borderRadius: 8, marginTop: 8 }} />
                : <span style={{ color: 'var(--muted)', fontSize: 13 }}>nenhuma logo configurada</span>
              }
            </div>
            <div className="field">
              <label className="field-label">Enviar nova logo (PNG ou JPEG, máx 2MB)</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="field-input"
                  onChange={e => setLogoFile(e.target.files[0] || null)}
                />
                <button
                  className="btn-save"
                  onClick={handleLogoUpload}
                  disabled={!logoFile || enviandoLogo}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {enviandoLogo ? 'enviando...' : 'Enviar logo'}
                </button>
              </div>
              {logoMsg && (
                <span style={{ fontSize: 13, color: logoMsg.startsWith('Erro') ? 'var(--danger, #e05555)' : 'var(--accent)' }}>
                  {logoMsg}
                </span>
              )}
            </div>
          </Section>
        )}

        {erro && <div style={{ padding: '0 28px', color: 'var(--danger, #e05555)', fontSize: 13 }}>{erro}</div>}

        {active !== 'imagem' && (
          <div className="settings-footer">
            <button className="btn-cancel" onClick={handleCancel} disabled={salvando}>cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={salvando}>
              {salvando ? 'salvando...' : salvo ? '✓ salvo' : 'salvar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

function Row({ children }) {
  return <div className="field-row">{children}</div>
}

function Field({ label, envKey, type = 'text', placeholder, hint, defaultValue, options, valores, onChange }) {
  const [show, setShow] = useState(false)
  const value = valores[envKey] ?? defaultValue ?? ''

  if (type === 'textarea') {
    return (
      <div className="field">
        <label className="field-label">{label}</label>
        <textarea
          className="field-textarea"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(envKey, e.target.value)}
        />
        {hint && <span className="field-hint">{hint}</span>}
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className="field">
        <label className="field-label">{label}</label>
        <select
          className="field-input"
          value={value}
          onChange={e => onChange(envKey, e.target.value)}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
    )
  }

  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className={type === 'password' ? 'field-secret' : ''}>
        <input
          className="field-input"
          type={type === 'password' && !show ? 'password' : type === 'number' ? 'number' : 'text'}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(envKey, e.target.value)}
        />
        {type === 'password' && (
          <button className="field-eye" onClick={() => setShow(s => !s)} type="button">
            {show ? '○' : '●'}
          </button>
        )}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

function StatusBadge({ ok, label }) {
  return (
    <div className={`status-badge ${ok ? 'ok' : 'err'}`}>
      <span className="status-dot" />
      {label}
    </div>
  )
}
