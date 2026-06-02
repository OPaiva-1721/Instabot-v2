import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function parseResposta(texto) {
  const limpo = texto.replace(/```json|```/g, '').trim()
  const json = JSON.parse(limpo)
  if (typeof json.copy !== 'string' || !Array.isArray(json.hashtags)) {
    throw new Error(`schema inválido: ${texto.slice(0, 100)}`)
  }
  if (!json.hook) json.hook = ''
  if (!json.nome_limpo) json.nome_limpo = ''
  return json
}

function buildPrompt(produto, nicho = null) {
  const tom = nicho?.claude_tom || process.env.CLAUDE_TOM || 'jovem e animado'
  const hashtagsPadrao = nicho?.claude_hashtags_padrao || process.env.CLAUDE_HASHTAGS_PADRAO || ''
  const promptBase = nicho?.claude_prompt_base || process.env.CLAUDE_PROMPT_BASE || 'Você é um especialista em marketing para Instagram brasileiro.'

  const temPreco = produto.preco_novo != null
  const infoPreco = temPreco
    ? `- Preço original: R$ ${produto.preco_antigo?.toFixed(2) ?? '?'}
- Preço com desconto: R$ ${produto.preco_novo.toFixed(2)}
- Desconto: ${produto.desconto ?? '?'}%`
    : `- Produto em oferta especial na Shopee`

  const hashtagsExtra = hashtagsPadrao ? `\n- Inclua estas hashtags fixas: ${hashtagsPadrao}` : ''

  return `
${promptBase}

## Produto
- Nome: ${produto.nome}
${infoPreco}

## Tarefa
Gere o copy completo para um post de Instagram promovendo esse produto em oferta.

## Regras
- Tom: ${tom}, direto ao ponto
${temPreco ? '- Destaque o desconto e o preço final com clareza' : '- Destaque que é uma oferta imperdível'}
- Máximo 3 parágrafos curtos
- Termine com "Link na bio 🔗"
- Inclua de 5 a 8 hashtags relevantes separadas do texto${hashtagsExtra}
- Use emojis com moderação (2 a 4 por parágrafo)

## Responda APENAS com JSON válido, sem markdown, sem explicações:
{
  "copy": "texto do post aqui",
  "hashtags": ["#oferta", "#shopee"],
  "hook": "FRASE CURTA EM CAPS",
  "nome_limpo": "Nome limpo do produto"
}

- "hook": frase curta (3 a 6 palavras, TUDO EM MAIÚSCULAS) descrevendo o benefício. Ex: "PRA DEIXAR O CARRO NO BRILHO".
- "nome_limpo": nome comercial limpo do produto, sem especificações técnicas, sem palavras repetidas, sem SEO. Ex: "Kit Shampoo Vonixx 240ml", "Relógio Smart T800 Ultra", "Manta Casal Soft 2,00x1,80m".
  `.trim()
}

export async function gerarCopy(produto, nicho = null, historico = []) {
  const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

  const messages = historico.length > 0
    ? historico
    : [{ role: 'user', content: buildPrompt(produto, nicho) }]

  const response = await client.messages.create({ model, max_tokens: 500, messages })
  return parseResposta(response.content[0].text)
}

export async function revisarCopy(historico, pedido) {
  const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

  const messages = [
    ...historico,
    { role: 'user', content: `${pedido}\n\nResponda APENAS com JSON: {"copy": "...", "hashtags": [...]}` }
  ]

  const response = await client.messages.create({ model, max_tokens: 500, messages })
  return parseResposta(response.content[0].text)
}
