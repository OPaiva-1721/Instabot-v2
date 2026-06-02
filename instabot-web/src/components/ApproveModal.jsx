import { useState, useEffect } from 'react'
import { API } from '../lib/api.js'
import './ApproveModal.css'

const TIPO_ICONS = { instagram: 'IG', whatsapp: 'WA' }

export default function ApproveModal({ produto, onConfirm, onCancel }) {
  const [canais, setCanais] = useState([])
  const [selecionados, setSelecionados] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingCanais, setLoadingCanais] = useState(true)
  const [erroCanais, setErroCanais] = useState(null)

  useEffect(() => {
    setLoadingCanais(true)
    setErroCanais(null)
    const url = produto?.nicho_id
      ? `${API}/nichos/${produto.nicho_id}/canais`
      : `${API}/canais?ativo=1`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        const lista = Array.isArray(data) ? data : []
        setCanais(lista)
        setSelecionados(new Set(lista.map(c => c.id)))
      })
      .catch(e => setErroCanais(e.message))
      .finally(() => setLoadingCanais(false))
  }, [produto?.nicho_id])

  const toggle = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    if (selecionados.size === 0) return
    setLoading(true)
    try {
      await onConfirm([...selecionados])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">aprovar publicação</span>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-section-label">publicar em</div>

          {loadingCanais && <span className="modal-hint">carregando canais...</span>}
          {erroCanais && <span className="modal-erro">{erroCanais}</span>}
          {!loadingCanais && !erroCanais && canais.length === 0 && (
            <span className="modal-hint">
              nenhum canal configurado{produto?.nicho_id ? ' para este nicho' : ''}. configure em Canais e Nichos.
            </span>
          )}

          {canais.map(c => (
            <label key={c.id} className="modal-check">
              <input
                type="checkbox"
                checked={selecionados.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className={`modal-canal-badge ${c.tipo}`}>{TIPO_ICONS[c.tipo]}</span>
              <span className="modal-check-label">{c.nome}</span>
            </label>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onCancel}>cancelar</button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={selecionados.size === 0 || loading || loadingCanais}
          >
            {loading ? 'publicando...' : '✓ publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}
