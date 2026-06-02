import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const ENV_PATH = fileURLToPath(new URL('../../.env', import.meta.url))

export function lerEnv() {
  const text = readFileSync(ENV_PATH, 'utf8')
  const result = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    result[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
  return result
}

export function salvarEnv(updates) {
  const text = readFileSync(ENV_PATH, 'utf8')
  const seen = new Set()
  const lines = text.split('\n').map(line => {
    const t = line.trim()
    if (!t || t.startsWith('#')) return line
    const eq = t.indexOf('=')
    if (eq === -1) return line
    const key = t.slice(0, eq).trim()
    if (key in updates) {
      seen.add(key)
      return `${key}=${updates[key]}`
    }
    return line
  })
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) lines.push(`${k}=${v}`)
  }
  writeFileSync(ENV_PATH, lines.join('\n'))
}
