import { useState } from 'react'
import './QueueSidebar.css'

const STATUS = {
  aguardando: { label: 'aguardando', cls: 'waiting' },
  gerado: { label: 'gerado', cls: 'generated' },
  aprovado: { label: 'aprovado', cls: 'approved' },
  processando: { label: 'gerando...', cls: 'processing' },
}

export default function QueueSidebar({ produtos, selectedId, onSelect, onProcessarFila, processando }) {
  const [busca, setBusca] = useState('')

  const filtrados = busca.trim()
    ? produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : produtos

  const counts = {
    aprovados: produtos.filter(p => p.status === 'aprovado').length,
    fila: produtos.filter(p => p.status === 'aguardando').length,
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-stats">
          <div className="stat">
            <span className="stat-num">{counts.aprovados}</span>
            <span className="stat-label">aprovados</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-num">{counts.fila}</span>
            <span className="stat-label">na fila</span>
          </div>
        </div>
        <input
          className="sidebar-search"
          placeholder="buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        {counts.fila > 0 && (
          <button
            className="btn-process-queue"
            onClick={onProcessarFila}
            disabled={processando}
            title="Gera copy + imagem e publica todos os produtos aguardando"
          >
            {processando ? 'processando...' : `⚡ processar fila (${counts.fila})`}
          </button>
        )}
      </div>

      <div className="sidebar-list">
        {filtrados.map(p => {
          const s = STATUS[p.status] ?? STATUS.aguardando
          return (
            <button
              key={p.id}
              className={`item ${selectedId === p.id ? 'selected' : ''}`}
              onClick={() => onSelect(p)}
            >
              <div className="item-top">
                <span className="item-name">{p.nome}</span>
                <span className={`badge ${s.cls}`}>{s.label}</span>
              </div>
              <div className="item-bottom">
                <span className="item-price-old">R$ {Number(p.preco_antigo).toFixed(2)}</span>
                <span className="item-arrow">→</span>
                <span className="item-price-new">R$ {Number(p.preco_novo).toFixed(2)}</span>
                <span className="item-discount">-{p.desconto}%</span>
              </div>
            </button>
          )
        })}
        {filtrados.length === 0 && (
          <div className="sidebar-empty">
            {busca.trim() ? 'nenhum resultado' : 'nenhum produto na fila'}
          </div>
        )}
      </div>
    </aside>
  )
}
