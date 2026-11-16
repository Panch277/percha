/** Lógica pura de la prueba virtual (sin red ni DOM), con tests */
import type { OutfitSlots } from '../outfits/engine.ts'
import type { TryOnErrorCode } from './types.ts'

/**
 * Qué prendas se prueban: arriba va el abrigo si hay (es lo que se vería), si no el top;
 * abajo, la de abajo. Gorra, lentes, reloj y calzado no se renderizan (limitación del modelo).
 */
export function tryOnParts(slots: OutfitSlots): { upper: string | null; lower: string | null } {
  return { upper: slots.outerwear ?? slots.top ?? null, lower: slots.bottom ?? null }
}

/** Traduce los mensajes de error de Gradio / Hugging Face a algo que se pueda explicar */
export function classifyError(message: string): TryOnErrorCode {
  const m = message.toLowerCase()
  if (/quota|exceeded your (gpu|zerogpu)|rate limit|too many requests|429/.test(m)) return 'quota'
  if (/sleeping|building|paused|runtime_error|space.*(error|unavailable|not found)|could not resolve app config|502|503|504|connection|failed to fetch|network/.test(m))
    return 'unavailable'
  if (/timeout|timed out|aborted/.test(m)) return 'timeout'
  return 'failed'
}
