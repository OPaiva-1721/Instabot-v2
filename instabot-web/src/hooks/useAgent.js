import { useState, useCallback, useRef } from 'react'

export function useAgent(revisarFn) {
  const [historico, setHistorico] = useState([])
  const [thinking, setThinking] = useState(false)
  const historicoRef = useRef(historico)
  const revisarFnRef = useRef(revisarFn)

  historicoRef.current = historico
  revisarFnRef.current = revisarFn

  const iniciar = useCallback((produto, { copy, hashtags }) => {
    const hashtagsStr = Array.isArray(hashtags) ? hashtags.join(' ') : hashtags
    setHistorico([
      {
        role: 'user',
        content: `Produto: ${produto.nome}\nPreço: R$ ${Number(produto.preco_novo).toFixed(2)} (${produto.desconto}% off)\n\nCopy atual:\n${copy}\n\nHashtags: ${hashtagsStr}`
      },
      {
        role: 'assistant',
        content: `Aqui está o copy gerado:\n\n"${copy}"\n\nHashtags: ${hashtagsStr}\n\nQuer ajustar alguma coisa?`
      }
    ])
  }, [])

  const enviar = useCallback(async (pedido) => {
    const novoHistorico = [
      ...historicoRef.current,
      { role: 'user', content: pedido }
    ]
    setHistorico(novoHistorico)
    setThinking(true)

    const resultado = await revisarFnRef.current(novoHistorico, pedido)
    const hashtagsStr = Array.isArray(resultado.hashtags)
      ? resultado.hashtags.join(' ')
      : resultado.hashtags

    setHistorico(h => [
      ...h,
      {
        role: 'assistant',
        content: `Atualizado!\n\n"${resultado.copy}"\n\nHashtags: ${hashtagsStr}\n\nAlguma outra alteração?`
      }
    ])
    setThinking(false)
    return resultado
  }, [])

  const resetar = useCallback(() => {
    setHistorico([])
    setThinking(false)
  }, [])

  return { historico, thinking, iniciar, enviar, resetar }
}
