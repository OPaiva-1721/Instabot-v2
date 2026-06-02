const runtimeUrl = typeof window !== 'undefined' &&
  window.__API_URL__ !== '__RUNTIME_API_URL__' ? window.__API_URL__ : null

export const API = (runtimeUrl || import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
