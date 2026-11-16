/**
 * Precalcula los embeddings de texto de CLIP (fp32) para todos los prompts de
 * src/lib/ai/prompts.ts y los guarda en src/lib/ai/clip-text-embeddings.json.
 *
 * Por qué: el modelo CLIP cuantizado (q8) arruina la parte de texto (no reconocía ni Levi's),
 * y el fp32 completo pesa 606 MB. Con el texto precalculado, el navegador solo baja el
 * encoder de visión q8 (89 MB), que sí mantiene la precisión.
 *
 * Uso: npm run clip:embed   (la primera vez baja el text_model fp32, ~254 MB)
 */
import { writeFileSync } from 'node:fs'
import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers'
import { allPrompts, CLIP_MODEL } from '../src/lib/ai/prompts.ts'

const prompts = allPrompts()
const tokenizer = await AutoTokenizer.from_pretrained(CLIP_MODEL)
const model = await CLIPTextModelWithProjection.from_pretrained(CLIP_MODEL, { dtype: 'fp32' })

const inputs = tokenizer(prompts, { padding: true, truncation: true })
const { text_embeds } = await model(inputs)
const [n, dim] = text_embeds.dims as [number, number]
const raw = text_embeds.data as Float32Array

// Normalizados (norma 1) para que el producto punto sea directamente el coseno
const out = new Float32Array(n * dim)
for (let i = 0; i < n; i++) {
  let s = 0
  for (let j = 0; j < dim; j++) s += raw[i * dim + j] ** 2
  s = Math.sqrt(s)
  for (let j = 0; j < dim; j++) out[i * dim + j] = raw[i * dim + j] / s
}

const json = {
  model: CLIP_MODEL,
  dim,
  prompts,
  data: Buffer.from(out.buffer).toString('base64'),
}
const file = new URL('../src/lib/ai/clip-text-embeddings.json', import.meta.url)
writeFileSync(file, JSON.stringify(json))
console.log(`OK: ${n} prompts × ${dim} → ${file.pathname}`)
