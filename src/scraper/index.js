import crypto from 'crypto'
import axios from 'axios'
import db from '../db/index.js'
import { processarAutomatico } from '../services/pipeline.js'

function sign(appId, secret, payload) {
  const timestamp = Math.floor(Date.now() / 1000)
  const factor = `${appId}${timestamp}${payload}${secret}`
  const signature = crypto.createHash('sha256').update(factor).digest('hex')
  return { timestamp, signature }
}

async function buscarProdutos() {
  const appId = process.env.SHOPEE_APP_ID?.trim()
  const secret = process.env.SHOPEE_SECRET?.trim()

  const body = {
    query: `{
        productOfferV2(listType: 2, sortType: 2, limit: 50) {
          nodes {
            itemId
            productName
            priceMin
            priceMax
            priceDiscountRate
            imageUrl
            offerLink
            sales
          }
        }
      }`
  }
  const payload = JSON.stringify(body)
  const { timestamp, signature } = sign(appId, secret, payload)

  const { data } = await axios.post(
    'https://open-api.affiliate.shopee.com.br/graphql',
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`
      },
      timeout: 10000
    }
  )

  if (data?.errors?.length) throw new Error(data.errors[0].message)
  return data?.data?.productOfferV2?.nodes ?? []
}

const inserir = db.prepare(`
  INSERT OR IGNORE INTO produtos
    (shopee_id, nome, preco_antigo, preco_novo, desconto, imagem_url, offer_link, nicho_id)
  VALUES
    (@shopee_id, @nome, @preco_antigo, @preco_novo, @desconto, @imagem_url, @offer_link, @nicho_id)
`)

export async function rodarScraper() {
  const autoPublish = process.env.AUTO_PUBLISH === 'true'
  const minimoGlobal = Number(process.env.DESCONTO_MINIMO ?? 20)

  console.log('[scraper] buscando produtos...')
  const produtos = await buscarProdutos()

  const nichos = db.prepare('SELECT * FROM nichos WHERE ativo = 1').all()
    .map(n => ({
      ...n,
      keywords: n.palavras_chave.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
    }))

  const novosIds = []

  for (const p of produtos) {
    const shopeeId = String(p.itemId)

    // Find first matching niche
    let nichoId = null
    let descontoMinimo = minimoGlobal

    for (const nicho of nichos) {
      if (nicho.keywords.length === 0) continue
      if (nicho.keywords.some(k => p.productName.toLowerCase().includes(k))) {
        nichoId = nicho.id
        descontoMinimo = nicho.desconto_minimo
        break
      }
    }

    if ((p.priceDiscountRate ?? 0) < descontoMinimo) continue

    const jaProcessado = db.prepare(`
      SELECT shopee_id FROM produtos
      WHERE shopee_id = ? AND criado_em > datetime('now', '-24 hours')
    `).get(shopeeId)
    if (jaProcessado) continue

    const desconto = p.priceDiscountRate ?? 0
    const precoNovo = parseFloat(p.priceMin)
    const precoAntigo = desconto > 0
      ? parseFloat((precoNovo / (1 - desconto / 100)).toFixed(2))
      : parseFloat(p.priceMax)

    const resultado = inserir.run({
      '@shopee_id': shopeeId,
      '@nome': p.productName,
      '@preco_antigo': precoAntigo,
      '@preco_novo': precoNovo,
      '@desconto': desconto,
      '@imagem_url': p.imageUrl,
      '@offer_link': p.offerLink ?? null,
      '@nicho_id': nichoId
    })

    if (resultado.changes > 0) novosIds.push(shopeeId)
  }

  console.log(`[scraper] ${novosIds.length} produtos adicionados à fila`)

  if (autoPublish && novosIds.length > 0) {
    console.log(`[pipeline] processando ${novosIds.length} produtos automaticamente...`)
    const selecionados = db.prepare(
      `SELECT * FROM produtos WHERE shopee_id IN (${novosIds.map(() => '?').join(',')})`
    ).all(...novosIds)

    await Promise.allSettled(
      selecionados.map(produto =>
        processarAutomatico(produto)
          .then(() => console.log(`[pipeline] produto ${produto.id} publicado`))
          .catch(e => console.error(`[pipeline] erro produto ${produto.id}:`, e.message))
      )
    )
  }
}
