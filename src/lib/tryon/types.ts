/**
 * Prueba virtual detrás de una interfaz, por si algún día se cambia el Space gratis por una
 * API paga. Hoy la implementación es OOTDiffusion (ver ootd.ts).
 */

/** En qué anda la prueba, para mostrarlo en la tarjeta */
export type TryOnStage =
  | { kind: 'connecting' }
  | { kind: 'queue'; position: number | null; eta: number | null }
  | { kind: 'running'; part: 'upper' | 'lower'; eta: number | null }
  | { kind: 'saving' }

export type TryOnErrorCode =
  /** se terminó la cuota diaria gratis de GPU */
  | 'quota'
  /** el Space está dormido, construyéndose o caído */
  | 'unavailable'
  /** tardó demasiado */
  | 'timeout'
  /** falta la foto del avatar */
  | 'no_avatar'
  /** el outfit no tiene arriba ni abajo para probar */
  | 'no_garments'
  /** cualquier otra cosa */
  | 'failed'

export class TryOnError extends Error {
  code: TryOnErrorCode
  /** si la parte de arriba salió y falló la de abajo: lo que se llegó a hacer */
  partial?: Blob
  constructor(code: TryOnErrorCode, message?: string, partial?: Blob) {
    super(message ?? code)
    this.code = code
    this.partial = partial
  }
}

export interface TryOnRequest {
  /** foto de cuerpo entero, 3:4 */
  person: Blob
  /** prenda de arriba (top o abrigo) sobre fondo blanco */
  upper: Blob | null
  /** prenda de abajo sobre fondo blanco */
  lower: Blob | null
}

export interface TryOnProvider {
  name: string
  run(req: TryOnRequest, onStage: (s: TryOnStage) => void, signal?: AbortSignal): Promise<Blob>
}
