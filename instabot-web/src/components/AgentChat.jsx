import { useState, useRef, useEffect } from 'react'
import './AgentChat.css'

const QUICK = ['Mais emojis', 'Tom mais jovem', 'Adicionar frete grátis', 'Trocar hashtags', 'Mais curto']

export default function AgentChat({ historico, thinking, onEnviar }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico, thinking])

  const submit = async (texto) => {
    if (!texto.trim()) return
    setInput('')
    await onEnviar(texto)
  }

  return (
    <div className="chat">
      <div className="chat-label">agente</div>

      <div className="chat-messages">
        {historico.length === 0 && (
          <div className="chat-empty">gere o post pra começar a conversar com o agente</div>
        )}
        {historico.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' && <div className="msg-tag">AI</div>}
            <div className="msg-bubble">{m.content}</div>
          </div>
        ))}
        {thinking && (
          <div className="msg assistant">
            <div className="msg-tag">AI</div>
            <div className="msg-bubble thinking">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {historico.length > 0 && (
        <div className="chat-quick">
          {QUICK.map(q => (
            <button key={q} className="quick-btn" onClick={() => submit(q)}>{q}</button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit(input)}
          placeholder="peça alterações ao agente..."
          disabled={thinking}
        />
        <button
          className="chat-send"
          onClick={() => submit(input)}
          disabled={thinking || !input.trim()}
          aria-label="Enviar"
        >
          →
        </button>
      </div>
    </div>
  )
}
