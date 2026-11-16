/** Preparación de imágenes para la prueba virtual (usa canvas: solo navegador) */
import { ai } from '../ai/client'
import { applyAlpha, canvas, ctx2d, fitInto, loadScaled, toBlob } from '../image'

/** Tamaño que espera OOTDiffusion (3:4) */
export const W = 768
export const H = 1024
/** fondo del avatar: casi blanco, como las fotos de estudio con las que se entrenó el modelo */
const AVATAR_BG = '#F4F4F4'

async function canvasFromUrl(url: string) {
  const bmp = await createImageBitmap(await (await fetch(url)).blob())
  const c = canvas(bmp.width, bmp.height)
  ctx2d(c).drawImage(bmp, 0, 0)
  bmp.close?.()
  return c
}

/** Prenda recortada (con alfa) → JPEG 3:4 sobre blanco, centrada con margen */
export async function garmentForTryOn(imageUrl: string) {
  return toBlob(fitInto(await canvasFromUrl(imageUrl), W, H, '#FFFFFF', 0.08), 'image/jpeg', 0.92)
}

/**
 * Foto de cuerpo entero → avatar 3:4 sin fondo. Usa el mismo recorte de fondo que las prendas;
 * si falla, encuadra la foto original. Devuelve también si se pudo recortar.
 */
export async function prepareAvatar(file: Blob): Promise<{ image: Blob; cutout: boolean }> {
  const src = await loadScaled(file, 1600)
  let framed: HTMLCanvasElement
  let cutout = true
  try {
    const mask = await ai.removeBackground(await toBlob(src, 'image/jpeg', 0.92))
    framed = fitInto(applyAlpha(src, mask.alpha, mask.width, mask.height), W, H, AVATAR_BG, 0.03)
  } catch (e) {
    console.warn('[avatar] sin recorte de fondo', e)
    cutout = false
    framed = fitInto(src, W, H, AVATAR_BG, 0)
  }
  return { image: await toBlob(framed, 'image/jpeg', 0.92), cutout }
}

/** El resultado del Space viene en PNG/JPEG pesado: se guarda como WebP 768×1024 */
export async function compressResult(blob: Blob) {
  const bmp = await createImageBitmap(blob)
  const c = canvas(W, H)
  const g = ctx2d(c)
  g.imageSmoothingQuality = 'high'
  g.drawImage(bmp, 0, 0, W, H)
  bmp.close?.()
  const webp = await toBlob(c, 'image/webp', 0.88)
  return webp.type === 'image/webp' ? webp : toBlob(c, 'image/jpeg', 0.88)
}
