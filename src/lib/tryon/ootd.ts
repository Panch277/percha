/**
 * Prueba virtual con el Space gratis `levihsu/OOTDiffusion` (licencia CC BY-NC-SA: uso personal).
 *
 * Por qué este y no los de la spec (verificado el 2026-11-16):
 * - Kwai-Kolors/Kolors-Virtual-Try-On no expone API (named_endpoints vacío).
 * - yisol/IDM-VTON tiene la máscara automática fija en "upper_body": solo prueba la parte de arriba.
 * - zhengchong/CatVTON estaba caído (RUNTIME_ERROR).
 * OOTDiffusion expone /process_dc con category Upper-body / Lower-body / Dress, así que se puede
 * probar arriba y después abajo sobre ese resultado. Cada paso tarda ~14 s sin cola.
 *
 * Corre en ZeroGPU: sin cuenta de Hugging Face hay una cuota diaria chica por IP.
 */
import { classifyError } from './plan'
import { getHfToken, onHfTokenChange } from './token'
import { TryOnError, type TryOnProvider, type TryOnStage } from './types'

const SPACE = 'levihsu/OOTDiffusion'
const ENDPOINT = '/process_dc'
/** máximo por paso (incluye la cola) */
const PART_TIMEOUT = 4 * 60 * 1000

type Gradio = Awaited<ReturnType<(typeof import('@gradio/client'))['Client']['connect']>>

let appPromise: Promise<Gradio> | null = null
// si cambia el token de Hugging Face, la próxima prueba se reconecta con el nuevo
onHfTokenChange(() => {
  appPromise = null
})

/** El cliente de Gradio se carga recién cuando hace falta (pesa y casi nunca se usa) */
async function connect(): Promise<Gradio> {
  if (!appPromise) {
    const hf_token = getHfToken() ?? undefined
    appPromise = import('@gradio/client')
      .then(({ Client }) => Client.connect(SPACE, { events: ['data', 'status'], hf_token }))
      .catch((e) => {
        appPromise = null
        throw e
      })
  }
  return appPromise
}

function errorOf(e: unknown): TryOnError {
  if (e instanceof TryOnError) return e
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  return new TryOnError(classifyError(msg), msg)
}

/** Corre un paso (arriba o abajo) y devuelve la imagen resultante */
async function runPart(
  app: Gradio,
  person: Blob,
  garment: Blob,
  part: 'upper' | 'lower',
  onStage: (s: TryOnStage) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const job = app.submit(ENDPOINT, {
    vton_img: person,
    garm_img: garment,
    category: part === 'upper' ? 'Upper-body' : 'Lower-body',
    n_samples: 1,
    n_steps: 20,
    image_scale: 2,
    seed: -1,
  })
  const timer = setTimeout(() => job.cancel(), PART_TIMEOUT)
  const onAbort = () => job.cancel()
  signal?.addEventListener('abort', onAbort)
  let timedOut = true
  try {
    for await (const ev of job) {
      if (ev.type === 'status') {
        if (ev.stage === 'error') {
          // message puede venir como texto o como lista de errores de validación
          const msg = typeof ev.message === 'string' ? ev.message : JSON.stringify(ev.message ?? 'error')
          throw new TryOnError(classifyError(msg), msg)
        }
        if (ev.stage === 'pending' && (ev.position ?? 0) > 0) onStage({ kind: 'queue', position: ev.position ?? null, eta: ev.eta ?? null })
        else if (ev.stage === 'pending' || ev.stage === 'generating') onStage({ kind: 'running', part, eta: ev.eta ?? null })
      }
      if (ev.type === 'data') {
        timedOut = false
        const gallery = (ev.data as { image?: { url?: string } }[][])[0]
        const url = gallery?.[0]?.image?.url
        if (!url) throw new TryOnError('failed', 'Respuesta sin imagen')
        const res = await fetch(url)
        if (!res.ok) throw new TryOnError('failed', `No se pudo bajar el resultado (${res.status})`)
        return await res.blob()
      }
    }
    throw new TryOnError(signal?.aborted ? 'failed' : timedOut ? 'timeout' : 'failed', 'Sin resultado')
  } catch (e) {
    throw errorOf(e)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const ootdProvider: TryOnProvider = {
  name: 'OOTDiffusion',
  async run(req, onStage, signal) {
    if (!req.upper && !req.lower) throw new TryOnError('no_garments')
    onStage({ kind: 'connecting' })
    let app: Gradio
    try {
      app = await connect()
    } catch (e) {
      const err = errorOf(e)
      // si no se puede ni conectar, casi seguro el Space está dormido o caído
      throw err.code === 'failed' ? new TryOnError('unavailable', err.message) : err
    }
    let person = req.person
    if (req.upper) person = await runPart(app, person, req.upper, 'upper', onStage, signal)
    if (req.lower) {
      try {
        person = await runPart(app, person, req.lower, 'lower', onStage, signal)
      } catch (e) {
        // si arriba ya salió, no se pierde: se devuelve como resultado parcial
        const err = errorOf(e)
        if (req.upper) err.partial = person
        throw err
      }
    }
    return person
  },
}
