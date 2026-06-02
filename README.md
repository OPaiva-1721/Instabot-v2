# Instabot

Ferramenta de automação de marketing de afiliados. Busca produtos em oferta na Shopee, gera copy e imagem com IA, e publica automaticamente em múltiplos canais: Instagram, WhatsApp, Telegram e TikTok.

---

## Funcionalidades

- **Scraper Shopee** — busca ofertas via API de afiliados a cada 15 minutos
- **Nichos** — filtra produtos por palavras-chave e configura tom/prompt de IA por nicho
- **Geração automática** — copy (Claude) + imagem com overlay de preço (Sharp)
- **Multi-canal** — publica em Instagram, WhatsApp (Evolution API), Telegram e TikTok
- **Aprovação manual** — fila de produtos com preview, edição de copy via chat com IA
- **Auto-publish** — modo automático por nicho, sem intervenção manual
- **Token TikTok** — OAuth completo com auto-refresh do access token

---

## Requisitos

- **Node.js 22.5+** (usa `node:sqlite` nativo)
- Conta de afiliado Shopee com acesso à API
- Chave de API Anthropic (Claude)
- Contas nos canais desejados (Instagram Business, Evolution API, bot Telegram, app TikTok)

---

## Instalação

```bash
# Backend
cd instabot
npm install

# Frontend
cd instabot-web
npm install
npm run build
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
# Shopee Afiliados
SHOPEE_APP_ID=seu_app_id
SHOPEE_SECRET=seu_secret
DESCONTO_MINIMO=20          # % mínimo global (fallback quando produto não tem nicho)

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-haiku-4-5-20251001
CLAUDE_TOM=jovem e animado
CLAUDE_HASHTAGS_PADRAO=#shopee #oferta #desconto
CLAUDE_PROMPT_BASE=Você é um especialista em marketing para Instagram brasileiro.

# Servidor
PORT=3000
PUBLIC_URL=https://seu-dominio.com  # Necessário para Instagram e TikTok
API_KEY=                             # Opcional: protege a API com x-api-key header

# Pipeline
AUTO_PUBLISH=false  # true = publica automaticamente ao scraper (requer nichos com canais)
```

> **Nota:** as credenciais de Instagram, WhatsApp, Telegram e TikTok são configuradas por canal dentro do app, não no `.env`.

---

## Rodando

```bash
# Desenvolvimento (backend com hot-reload)
cd instabot
npm run dev

# Frontend em desenvolvimento
cd instabot-web
npm run dev    # roda em http://localhost:5173 com proxy para :3000

# Produção
cd instabot
npm start

# Build do frontend para produção
cd instabot-web
npm run build  # gera dist/ — sirva estático ou configure o Fastify para servir
```

---

## Configurando canais e nichos

### 1. Canais

Acesse **Canais** no menu. Clique em **IG**, **WA**, **TG** ou **TK** para criar um canal de cada tipo.

#### Instagram
| Campo | Descrição |
|-------|-----------|
| Account ID | ID da conta Business/Creator (ex: `17841400000000000`) |
| Access Token | Token do Graph API — gere em [developers.facebook.com](https://developers.facebook.com) |

> Requer `PUBLIC_URL` configurado — o Instagram baixa a imagem via URL pública.

#### WhatsApp (Evolution API)
| Campo | Descrição |
|-------|-----------|
| URL da Evolution API | Ex: `https://evolution.seuservidor.com` |
| API Key | Chave de acesso da instância |
| Instância | Nome da instância no Evolution |
| Grupo | Selecione da lista (após sincronizar na página WhatsApp) |

#### Telegram
| Campo | Descrição |
|-------|-----------|
| Bot Token | Crie um bot via `@BotFather` e copie o token |
| Chat ID | ID do grupo/canal — use `@userinfobot` para descobrir. Grupos: número negativo. Canais públicos: `@username` |

> Não precisa de `PUBLIC_URL` — envia a imagem diretamente do disco.

#### TikTok
| Campo | Descrição |
|-------|-----------|
| Client Key | Em [developers.tiktok.com](https://developers.tiktok.com) → seu app → Client Key |
| Client Secret | Idem, Client Secret |
| Privacidade | `público`, `seguidores`, `amigos mútuos` ou `só eu` (para testes) |

**Configuração do app TikTok:**
1. Crie um app em developers.tiktok.com
2. Adicione o produto **"Content Posting API"**
3. Defina o Redirect URI como `{PUBLIC_URL}/tiktok/callback`
4. Ative os scopes `user.info.basic` e `video.publish`

**Conectando a conta:**
1. Crie o canal, preencha Client Key e Secret, salve
2. Clique **"Conectar conta TikTok"** → janela OAuth abre
3. Autorize o app — o instabot detecta automaticamente e exibe `✓ conectado como @conta`
4. O access token é renovado automaticamente antes de expirar (~24h)

---

### 2. Nichos

Acesse **Nichos** no menu. Clique em **+** para criar.

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: `Moda Feminina`, `Tecnologia` |
| Palavras-chave | Ex: `vestido,blusa,saia,calça` — produto entra no nicho se o nome contiver qualquer uma |
| Desconto mínimo | % mínimo para produtos deste nicho (sobrescreve o global) |
| Tom de escrita | Tom do copy gerado pela IA |
| Hashtags fixas | Hashtags sempre incluídas nos posts deste nicho |
| Prompt base | Instrução base para o Claude — deixe em branco para usar o global |
| Canais | Marque quais canais publicam produtos deste nicho |

---

## Fluxo de uso

### Manual (aprovação produto a produto)

1. Scraper roda a cada 15 min e preenche a **Fila**
2. Selecione um produto na fila
3. Clique **↺ regerar** para gerar copy e imagem
4. Edite o copy via chat com a IA se necessário
5. Clique **✓ aprovar** → selecione os canais → publique

### Automático

1. Configure nichos com canais atribuídos
2. Ative `AUTO_PUBLISH=true` no `.env` (ou em Config → Pipeline)
3. O scraper classifica cada produto no nicho correto e publica automaticamente

---

## Sincronizando grupos WhatsApp

Na página **WhatsApp**, clique em **↺** para importar todos os grupos da Evolution API para o banco local. Use **★** para marcar favoritos — o modal de aprovação mostrará apenas grupos favoritos.

---

## Estrutura do projeto

```
instabot/
├── src/
│   ├── agent/
│   │   ├── claude.js        # geração de copy via Claude (por nicho)
│   │   └── image.js         # processamento de imagem com Sharp
│   ├── db/
│   │   └── index.js         # SQLite (node:sqlite), migrations automáticas
│   ├── routes/
│   │   ├── index.js         # fila, gerar, revisar, aprovar, pipeline
│   │   ├── canais.js        # CRUD de canais
│   │   ├── nichos.js        # CRUD de nichos + assign canais
│   │   ├── whatsapp.js      # grupos WPP (sync + favoritos)
│   │   ├── settings.js      # variáveis de ambiente
│   │   └── tiktok.js        # OAuth TikTok (authorize + callback)
│   ├── scraper/
│   │   └── index.js         # Shopee Affiliate API, filtra por nicho
│   └── services/
│       ├── pipeline.js      # orquestra geração + publicação multi-canal
│       ├── instagram.js     # Graph API
│       ├── evolution.js     # Evolution API (WhatsApp)
│       ├── telegram.js      # Telegram Bot API
│       └── tiktok.js        # TikTok Content Posting API + token refresh
├── data/
│   ├── instabot.db          # banco SQLite
│   ├── images/              # imagens processadas
│   └── logo.png             # logo para overlay (opcional)
├── instabot-web/            # frontend React + Vite
│   └── src/pages/
│       ├── Queue.jsx        # fila de produtos
│       ├── Nichos.jsx       # gestão de nichos
│       ├── Canais.jsx       # gestão de canais
│       ├── WhatsApp.jsx     # grupos e histórico WPP
│       └── Settings.jsx     # configurações globais
└── .env
```

---

## Banco de dados

| Tabela | Descrição |
|--------|-----------|
| `produtos` | Produtos scraped com status, copy, imagem e nicho |
| `nichos` | Filtros e config de IA por segmento |
| `canais` | Destinos de publicação com credenciais em JSON |
| `nicho_canais` | Relação N:N nichos ↔ canais |
| `envios` | Histórico de publicações com status e erro |
| `grupos_wpp` | Cache de grupos WhatsApp (sincronizado da Evolution API) |

Migrations rodam automaticamente ao iniciar — nenhum comando extra necessário.

---

## Variáveis de ambiente — referência completa

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SHOPEE_APP_ID` | Sim | App ID da API de afiliados Shopee |
| `SHOPEE_SECRET` | Sim | Secret da API de afiliados Shopee |
| `DESCONTO_MINIMO` | Não | % mínimo global de desconto (padrão: `20`) |
| `ANTHROPIC_API_KEY` | Sim | Chave da API Anthropic |
| `CLAUDE_MODEL` | Não | Modelo Claude (padrão: `claude-haiku-4-5-20251001`) |
| `CLAUDE_TOM` | Não | Tom padrão do copy (padrão: `jovem e animado`) |
| `CLAUDE_HASHTAGS_PADRAO` | Não | Hashtags globais incluídas em todo copy |
| `CLAUDE_PROMPT_BASE` | Não | Instrução base global para o Claude |
| `PUBLIC_URL` | Para IG/TikTok | URL pública do backend (ex: ngrok em dev) |
| `AUTO_PUBLISH` | Não | `true` para publicar automaticamente (padrão: `false`) |
| `PORT` | Não | Porta do servidor (padrão: `3000`) |
| `API_KEY` | Não | Chave para autenticar requests à API via `x-api-key` |
