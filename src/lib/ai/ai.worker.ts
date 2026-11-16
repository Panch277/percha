/// <reference lib="webworker" />
/**
 * Worker de IA: corre los modelos fuera del hilo principal para no congelar la UI.
 * Los modelos se descargan de Hugging Face la primera vez y quedan cacheados en el navegador.
 */
import { AutoProcessor, CLIPVisionModelWithProjection, env, pipeline, RawImage } from '@huggingface/transformers'
import textEmb from './clip-text-embeddings.json'
import { CLIP_MODEL } from './prompts'
import type { WorkerRequest, WorkerResponse } from './protocol'

env.allowLocalModels = false

type AnyPipe = (input: unknown, ...args: unknown[]) => Promise<any>
type Clip = (img: RawImage) => Promise<Float32Array>

let segPromise: Promise<AnyPipe> | null = null
let clipPromise: Promise<Clip> | null = null

/** Embeddings de texto precalculados (fp32, normalizados) indexados por prompt */
const TEXT = (() => {
  const bin = atob(textEmb.data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const all = new Float32Array(bytes.buffer)
  const dim = textEmb.dim
  return new Map(textEmb.prompts.map((p, i) => [p, all.subarray(i * dim, (i + 1) * dim)]))
})()

/** logit_scale de CLIP ViT-B/32 (exp(4.6052)) */
const LOGIT_SCALE = 100

const post = (msg: WorkerResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg)

function progressFor(model: 'seg' | 'clip') {
  const files = new Map<string, { loaded: number; total: number }>()
  return (p: any) => {
    if (p?.status === 'progress' && p.file) {
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 })
      let loaded = 0
      let total = 0
      for (const f of files.values()) {
        loaded += f.loaded
        total += f.total
      }
      post({ type: 'progress', model, loaded, total })
    }
  }
}

async function hasWebGPU() {
  try {
    const gpu = (navigator as any).gpu
    if (!gpu) return false
    const adapter = await gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}

/**
 * RMBG-1.4 (BRIA, licencia de uso no comercial: OK para uso personal) es un modelo ISNet
 * entrenado para recortar productos. Se le pasa la config a mano porque el repo no trae un
 * model_type que transformers.js reconozca.
 */
async function loadSeg(): Promise<AnyPipe> {
  const gpu = await hasWebGPU()
  const attempts: { model: string; device: 'webgpu' | 'wasm'; dtype: string; config?: object }[] = [
    ...(gpu ? [{ model: 'briaai/RMBG-1.4', device: 'webgpu' as const, dtype: 'fp32', config: { model_type: 'isnet' } }] : []),
    { model: 'briaai/RMBG-1.4', device: 'wasm', dtype: 'q8', config: { model_type: 'isnet' } },
    { model: 'briaai/RMBG-1.4', device: 'wasm', dtype: 'fp32', config: { model_type: 'isnet' } },
  ]
  let lastErr: unknown
  for (const a of attempts) {
    try {
      const p = await pipeline('background-removal', a.model, {
        device: a.device,
        dtype: a.dtype as any,
        config: a.config as any,
        progress_callback: progressFor('seg'),
      })
      return p as unknown as AnyPipe
    } catch (e) {
      lastErr = e
      console.warn('[ai] fallo al cargar', a, e)
    }
  }
  throw lastErr
}

/**
 * CLIP: solo el encoder de visión, q8 en wasm (89 MB, ~0.2 s por foto en una compu).
 * El texto ya viene precalculado en fp32: el CLIP completo q8 perdía casi toda la precisión
 * por la cuantización del texto, y el fp32 completo pesa 606 MB (y no entraba en la caché).
 */
async function loadClip(): Promise<Clip> {
  const progress_callback = progressFor('clip')
  const [processor, model] = await Promise.all([
    AutoProcessor.from_pretrained(CLIP_MODEL, { progress_callback }),
    CLIPVisionModelWithProjection.from_pretrained(CLIP_MODEL, { device: 'wasm', dtype: 'q8', progress_callback }),
  ])
  return async (img: RawImage) => {
    const { image_embeds } = await model(await processor(img))
    const v = image_embeds.data as Float32Array
    let s = 0
    for (let i = 0; i < v.length; i++) s += v[i] * v[i]
    s = Math.sqrt(s)
    return v.map((x) => x / s)
  }
}

/** Softmax de similitudes coseno contra los prompts, ordenado de mayor a menor */
function rank(img: Float32Array, labels: string[]) {
  const logits = labels.map((label) => {
    const t = TEXT.get(label)
    if (!t) throw new Error(`Falta el embedding de "${label}". Corré npm run clip:embed`)
    let dot = 0
    for (let i = 0; i < t.length; i++) dot += t[i] * img[i]
    return LOGIT_SCALE * dot
  })
  const max = Math.max(...logits)
  const exp = logits.map((l) => Math.exp(l - max))
  const sum = exp.reduce((a, b) => a + b, 0)
  return labels.map((label, i) => ({ label, score: exp[i] / sum })).sort((a, b) => b.score - a.score)
}

function getSeg() {
  if (!segPromise) segPromise = loadSeg().catch((e) => ((segPromise = null), Promise.reject(e)))
  return segPromise
}
function getClip() {
  if (!clipPromise) clipPromise = loadClip().catch((e) => ((clipPromise = null), Promise.reject(e)))
  return clipPromise
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data
  try {
    switch (req.type) {
      case 'warmup': {
        await Promise.all([getSeg(), getClip()])
        post({ type: 'result', id: req.id, payload: true })
        break
      }
      case 'removeBg': {
        const seg = await getSeg()
        const img = await RawImage.fromBlob(req.image)
        const out: RawImage = await seg(img)
        // Devolvemos solo el canal alfa: el hilo principal lo aplica sobre la imagen original
        const alpha = new Uint8ClampedArray(out.width * out.height)
        const ch = out.channels
        for (let i = 0, j = ch - 1; i < alpha.length; i++, j += ch) alpha[i] = out.data[j]
        post({ type: 'result', id: req.id, payload: { alpha, width: out.width, height: out.height } }, )
        break
      }
      case 'classify': {
        const clip = await getClip()
        const emb = await clip(await RawImage.fromBlob(req.image))
        const results: Record<string, { label: string; score: number }[]> = {}
        for (const [group, labels] of Object.entries(req.groups)) results[group] = rank(emb, labels)
        post({ type: 'result', id: req.id, payload: results })
        break
      }
    }
  } catch (e) {
    post({ type: 'error', id: req.id, message: e instanceof Error ? e.message : String(e) })
  }
}
