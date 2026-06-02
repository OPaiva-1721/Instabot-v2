import sharp from 'sharp'
import axios from 'axios'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '../../data/images')
mkdirSync(OUTPUT_DIR, { recursive: true })

async function baixarImagem(url) {
  const { data } = await axios.get(url, { responseType: 'arraybuffer' })
  return Buffer.from(data)
}

function overlaysvg(precoAntigo, precoNovo, desconto) {
  return `
    <svg width="1000" height="160">
      <rect x="0" y="0" width="1000" height="160" rx="20" fill="rgba(20,20,20,0.88)"/>
      <text x="40" y="52" font-family="Arial" font-size="32" fill="#aaaaaa" text-decoration="line-through">
        R$ ${precoAntigo.toFixed(2)}
      </text>
      <text x="40" y="128" font-family="Arial" font-size="80" font-weight="bold" fill="#ffffff">
        R$ ${precoNovo.toFixed(2)}
      </text>
      <rect x="800" y="36" width="160" height="72" rx="36" fill="#D85A30"/>
      <text x="880" y="90" font-family="Arial" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">
        -${desconto}%
      </text>
    </svg>
  `
}

export async function processarImagem(produto) {
  const imgBuffer = await baixarImagem(produto.imagem_url)
  const outputPath = join(OUTPUT_DIR, `${produto.id}.jpg`)

  const base = sharp(imgBuffer).resize(1080, 1080, { fit: 'cover' })

  if (produto.preco_novo != null) {
    const overlay = Buffer.from(overlaysvg(
      produto.preco_antigo,
      produto.preco_novo,
      produto.desconto
    ))
    await base
      .composite([{ input: overlay, top: 880, left: 40 }])
      .jpeg({ quality: 90 })
      .toFile(outputPath)
  } else {
    await base.jpeg({ quality: 90 }).toFile(outputPath)
  }

  return outputPath
}
