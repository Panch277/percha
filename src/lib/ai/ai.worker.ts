/// <reference lib="webworker" />
/**
 * Worker de IA: corre los modelos fuera del hilo principal para no congelar la UI.
 * Los modelos se descargan de Hugging Face la primera vez y quedan cacheados en el navegador.
 */
import { env, pipeline, RawImage } from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './protocol'

env.allowLocalModels = false

type AnyPipe = (input: unknown, ...args: unknown[]) => Promise<any>

let segPromise: Promise<AnyPipe> | null = null
let clipPromise: Promise<AnyPipe> | null = null

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

async function loadClip(): Promise<AnyPipe> {
  const gpu = await hasWebGPU()
  const attempts: { device: 'webgpu' | 'wasm'; dtype: string }[] = [
    ...(gpu ? [{ device: 'webgpu' as const, dtype: 'fp32' }] : []),
    { device: 'wasm', dtype: 'q8' },
  ]
  let lastErr: unknown
  for (const a of attempts) {
    try {
      const p = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', {
        device: a.device,
        dtype: a.dtype as any,
        progress_callback: progressFor('clip'),
      })
      return p as unknown as AnyPipe
    } catch (e) {
      lastErr = e
      console.warn('[ai] fallo al cargar CLIP', a, e)
    }
  }
  throw lastErr
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
        const img = await RawImage.fromBlob(req.image)
        const results: Record<string, { label: string; score: number }[]> = {}
        for (const [group, labels] of Object.entries(req.groups)) {
          const r = await clip(img, labels, { hypothesis_template: '{}' })
          results[group] = r as { label: string; score: number }[]
        }
        post({ type: 'result', id: req.id, payload: results })
        break
      }
    }
  } catch (e) {
    post({ type: 'error', id: req.id, message: e instanceof Error ? e.message : String(e) })
  }
}
