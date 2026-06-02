import { DatabaseSync } from 'node:sqlite'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(join(__dirname, '../../data/instabot.db'))

db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS nichos (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    nome                   TEXT NOT NULL,
    palavras_chave         TEXT NOT NULL DEFAULT '',
    desconto_minimo        INTEGER NOT NULL DEFAULT 20,
    claude_tom             TEXT NOT NULL DEFAULT 'jovem e animado',
    claude_prompt_base     TEXT NOT NULL DEFAULT '',
    claude_hashtags_padrao TEXT NOT NULL DEFAULT '',
    ativo                  INTEGER NOT NULL DEFAULT 1,
    criado_em              TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS canais (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo      TEXT NOT NULL,
    nome      TEXT NOT NULL,
    config    TEXT NOT NULL DEFAULT '{}',
    ativo     INTEGER NOT NULL DEFAULT 1,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Migration: remove old CHECK constraint that blocked telegram type
{
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='canais'").get()
  if (row?.sql?.includes("CHECK(tipo IN ('instagram','whatsapp'))")) {
    db.exec('PRAGMA foreign_keys = OFF')
    db.exec(`
      CREATE TABLE canais_new (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo      TEXT NOT NULL,
        nome      TEXT NOT NULL,
        config    TEXT NOT NULL DEFAULT '{}',
        ativo     INTEGER NOT NULL DEFAULT 1,
        criado_em TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    db.exec('INSERT INTO canais_new SELECT * FROM canais')
    db.exec('DROP TABLE canais')
    db.exec('ALTER TABLE canais_new RENAME TO canais')
    db.exec('PRAGMA foreign_keys = ON')
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS nicho_canais (
    nicho_id INTEGER NOT NULL REFERENCES nichos(id) ON DELETE CASCADE,
    canal_id INTEGER NOT NULL REFERENCES canais(id) ON DELETE CASCADE,
    PRIMARY KEY (nicho_id, canal_id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS produtos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    shopee_id     TEXT UNIQUE NOT NULL,
    nome          TEXT NOT NULL,
    preco_antigo  REAL,
    preco_novo    REAL,
    desconto      INTEGER,
    imagem_url    TEXT NOT NULL,
    offer_link    TEXT,
    status        TEXT NOT NULL DEFAULT 'aguardando',
    copy          TEXT,
    hashtags      TEXT,
    hook          TEXT,
    nome_limpo    TEXT,
    imagem_path   TEXT,
    nicho_id      INTEGER REFERENCES nichos(id),
    criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS envios (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id  INTEGER NOT NULL REFERENCES produtos(id),
    canal_id    INTEGER REFERENCES canais(id),
    canal       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pendente',
    grupo_id    TEXT,
    erro        TEXT,
    enviado_em  TEXT
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS grupos_wpp (
    id       TEXT PRIMARY KEY,
    nome     TEXT NOT NULL,
    membros  INTEGER DEFAULT 0,
    favorito INTEGER DEFAULT 0
  )
`)

// Migration: old schema (no nicho_id) → clear data, add column
const colsProdutos = db.prepare('PRAGMA table_info(produtos)').all().map(c => c.name)
if (!colsProdutos.includes('nicho_id')) {
  db.exec('DELETE FROM envios')
  db.exec('DELETE FROM produtos')
  db.exec('ALTER TABLE produtos ADD COLUMN nicho_id INTEGER REFERENCES nichos(id)')
}

// Migration: add canal_id to envios if upgrading
const colsEnvios = db.prepare('PRAGMA table_info(envios)').all().map(c => c.name)
if (!colsEnvios.includes('canal_id')) {
  db.exec('ALTER TABLE envios ADD COLUMN canal_id INTEGER REFERENCES canais(id)')
}

export default db
