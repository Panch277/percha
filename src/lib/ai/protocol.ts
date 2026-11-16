export type WorkerRequest =
  | { type: 'warmup'; id: number }
  | { type: 'removeBg'; id: number; image: Blob }
  | { type: 'classify'; id: number; image: Blob; groups: Record<string, string[]> }

export type WorkerResponse =
  | { type: 'progress'; model: 'seg' | 'clip'; loaded: number; total: number }
  | { type: 'result'; id: number; payload: unknown }
  | { type: 'error'; id: number; message: string }

export interface AlphaMask {
  alpha: Uint8ClampedArray
  width: number
  height: number
}
