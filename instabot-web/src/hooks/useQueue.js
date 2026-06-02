import { useState, useEffect, useCallback, useRef } from 'react'
import { API } from '../lib/api.js'

export function useQueue() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch(`${API}/fila`)
      const data = await res.json()
      setProdutos(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch_()

    const tick = () => { if (!document.hidden) fetch_() }
    const t = setInterval(tick, 15000)
    return () => clearInterval(t)
  }, [fetch_])

  return { produtos, loading, refresh: fetch_ }
}

export function useProduto(id) {
  const [produto, setProduto] = useState(null)
  const [loading, setLoading] = useState(false)
  const idRef = useRef(id)

  useEffect(() => {
    idRef.current = id
    if (!id) { setProduto(null); return }
    fetch(`${API}/fila/${id}`)
      .then(r => r.json())
      .then(data => { if (idRef.current === id) setProduto(data) })
  }, [id])

  const gerar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/fila/${id}/gerar`, { method: 'POST' })
      const data = await res.json()
      setProduto(p => ({ ...p, ...data, status: 'gerado' }))
      return data
    } finally {
      setLoading(false)
    }
  }, [id])

  const revisar = useCallback(async (historico, pedido) => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/fila/${id}/revisar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historico, pedido })
      })
      const data = await res.json()
      setProduto(p => ({ ...p, ...data }))
      return data
    } finally {
      setLoading(false)
    }
  }, [id])

  const aprovar = useCallback(async (canal_ids) => {
    const res = await fetch(`${API}/fila/${id}/aprovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canal_ids })
    })
    return res.json()
  }, [id])

  return { produto, setProduto, loading, gerar, revisar, aprovar }
}
