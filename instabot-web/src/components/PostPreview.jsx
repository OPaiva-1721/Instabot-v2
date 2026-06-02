import { useState } from 'react'
import './PostPreview.css'

const TABS = ['Feed', 'Story', 'Reels']

export default function PostPreview({ produto }) {
  const [tab, setTab] = useState('Feed')

  if (!produto) return (
    <div className="preview-empty">
      <span>selecione um produto na fila</span>
    </div>
  )

  const copy = produto.copy ?? ''
  const hashtags = produto.hashtags ?? ''
  const isVertical = tab === 'Story' || tab === 'Reels'

  return (
    <div className="preview">
      <div className="preview-label">preview</div>

      <div className={`post-card ${isVertical ? 'post-card--vertical' : ''}`}>
        {tab === 'Feed' && (
          <div className="post-header">
            <div className="post-avatar" />
            <div>
              <div className="post-handle">moda.oficial</div>
              <div className="post-location">São Paulo, Brasil</div>
            </div>
          </div>
        )}

        <div className={`post-image ${isVertical ? 'post-image--vertical' : ''}`}>
          {produto.imagem_path
            ? <img src={`/images/${produto.id}.jpg`} alt={produto.nome} />
            : produto.imagem_url
              ? <img src={produto.imagem_url} alt={produto.nome} />
              : <div className="post-image-placeholder">imagem do produto</div>
          }
          <div className="post-overlay">
            <div className="overlay-prices">
              <span className="overlay-old">R$ {Number(produto.preco_antigo).toFixed(2)}</span>
              <span className="overlay-new">R$ {Number(produto.preco_novo).toFixed(2)}</span>
            </div>
            <div className="overlay-badge">-{produto.desconto}%</div>
          </div>
          {isVertical && (
            <div className="post-overlay-top">
              <div className="post-avatar post-avatar--small" />
              <span className="post-handle">moda.oficial</span>
              {tab === 'Story' && <span className="story-time">agora</span>}
            </div>
          )}
          {isVertical && copy && (
            <div className="post-caption-vertical">
              <p>{copy}</p>
              {hashtags && <p className="post-hashtags">{hashtags}</p>}
            </div>
          )}
        </div>

        {tab === 'Feed' && (
          <div className="post-body">
            <div className="post-actions">
              <div className="post-icons">
                <span className="post-icon">♡</span>
                <span className="post-icon">◯</span>
                <span className="post-icon">⇪</span>
              </div>
              <span className="post-icon">⊡</span>
            </div>
            <div className="post-likes">347 curtidas</div>
            {copy && <p className="post-copy"><strong>moda.oficial</strong> {copy}</p>}
            {hashtags && <p className="post-hashtags">{hashtags}</p>}
          </div>
        )}
      </div>

      <div className="preview-tabs">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`preview-tab ${tab === t ? 'active' : ''}`}>{t}</button>
        ))}
      </div>
    </div>
  )
}
