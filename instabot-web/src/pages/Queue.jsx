import { useState } from 'react'
import { API } from '../lib/api.js'
import { useMobile } from '../hooks/useMobile.js'
import { useQueue, useProduto } from '../hooks/useQueue.js'
import { useAgent } from '../hooks/useAgent.js'
import QueueSidebar from '../components/QueueSidebar.jsx'
import PostPreview from '../components/PostPreview.jsx'
import AgentChat from '../components/AgentChat.jsx'
import ApproveModal from '../components/ApproveModal.jsx'
import './Queue.css'

export default function Queue() {
  const { produtos, refresh } = useQueue()
  const [selected, setSelected] = useState(null)
  const { produto, setProduto, loading, gerar, revisar, aprovar } = useProduto(selected?.id)
  const { historico, thinking, iniciar, enviar, resetar } = useAgent(revisar)
  const [modalAberto, setModalAberto] = useState(false)
  const [erroEnvio, setErroEnvio] = useState(null)
  const [processando, setProcessando] = useState(false)
  const mobile = useMobile()
  const [mobileView, setMobileView] = useState('list')

  const handleSelect = (p) => {
    setSelected(p)
    setProduto(p)
    resetar()
    if (p.copy) iniciar(p, p)
    setErroEnvio(null)
    if (mobile) setMobileView('detail')
  }

  const handleGerar = async () => {
    const resultado = await gerar()
    iniciar(selected, resultado)
  }

  const handleProcessarFila = async () => {
    setProcessando(true)
    setErroEnvio(null)
    try {
      await fetch(`${API}/pipeline/processar-fila`, { method: 'POST' })
      refresh()
    } catch (e) {
      setErroEnvio(`Erro ao processar fila: ${e.message}`)
    } finally {
      setProcessando(false)
    }
  }

  const handleAprovarConfirmar = async (canal_ids) => {
    const resultado = await aprovar(canal_ids)
    setModalAberto(false)
    refresh()
    const erros = Object.values(resultado)
      .filter(r => r && !r.ok)
      .map(r => `${r.nome}: ${r.erro}`)
    setErroEnvio(erros.length > 0 ? erros.join(' · ') : null)
  }

  const displayProduto = produto ?? selected

  return (
    <div className="queue-page" data-view={mobile ? mobileView : undefined}>
      <QueueSidebar
        produtos={produtos}
        selectedId={selected?.id}
        onSelect={handleSelect}
        onProcessarFila={handleProcessarFila}
        processando={processando}
      />

      <div className="queue-main">
        {selected && (
          <div className="queue-header">
            {mobile && (
              <button className="btn-back" onClick={() => setMobileView('list')}>←</button>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="queue-title">{selected.nome}</div>
              {selected.nicho_nome && (
                <div className="queue-nicho-badge">{selected.nicho_nome}</div>
              )}
            </div>
            <div className="queue-actions">
              <button
                className="btn-secondary"
                onClick={handleGerar}
                disabled={loading}
              >
                {loading ? 'gerando...' : '↺ regerar'}
              </button>
              <button
                className="btn-primary"
                onClick={() => { setErroEnvio(null); setModalAberto(true) }}
                disabled={!selected}
              >
                ✓ aprovar
              </button>
            </div>
          </div>
        )}
        {erroEnvio && (
          <div className="queue-error">
            <span>⚠ {erroEnvio}</span>
            <button className="queue-error-close" onClick={() => setErroEnvio(null)}>✕</button>
          </div>
        )}

        <div className="queue-content">
          <PostPreview produto={displayProduto} />
          <AgentChat
            historico={historico}
            thinking={thinking}
            onEnviar={enviar}
          />
        </div>
      </div>

      {modalAberto && (
        <ApproveModal
          produto={selected}
          onConfirm={handleAprovarConfirmar}
          onCancel={() => setModalAberto(false)}
        />
      )}
    </div>
  )
}
