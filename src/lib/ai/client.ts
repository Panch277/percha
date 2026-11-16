import type { AlphaMask, WorkerRequest, WorkerResponse } from './protocol'

type Pending = { resolve: (v: any) => void; reject: (e: Error) => void }
export type ModelProgress = { seg: number | null; clip: number | null }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, Pending>()
const progress: ModelProgress = { seg: null, clip: null }
const listeners = new Set<(p: ModelProgress) => void>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data
      if (msg.type === 'progress') {
        progress[msg.model] = msg.total > 0 ? msg.loaded / msg.total : null
        listeners.forEach((l) => l({ ...progress }))
        return
      }
      const p = pending.get(msg.id)
      if (!p) return
      pending.delete(msg.id)
      if (msg.type === 'result') p.resolve(msg.payload)
      else p.reject(new Error(msg.message))
    }
    worker.onerror = (e) => {
      pending.forEach((p) => p.reject(new Error(e.message || 'Error en el worker de IA')))
      pending.clear()
    }
  }
  return worker
}

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never

function call<T>(req: DistributiveOmit<WorkerRequest, 'id'>): Promise<T> {
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ ...req, id } as WorkerRequest)
  })
}

export const ai = {
  warmup: () => call<boolean>({ type: 'warmup' }),
  removeBackground: (image: Blob) => call<AlphaMask>({ type: 'removeBg', image }),
  classify: (image: Blob, groups: Record<string, string[]>) =>
    call<Record<string, { label: string; score: number }[]>>({ type: 'classify', image, groups }),
  onProgress(fn: (p: ModelProgress) => void) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
}
