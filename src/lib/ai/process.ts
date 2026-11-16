import { dominantColors, refineWithClip } from '../color'
import { applyAlpha, ctx2d, loadScaled, resizeTo, toAlphaBlob, toBlob, trimToSquare } from '../image'
import type { GarmentInput } from '../store/types'
import { autoDescription, type Lang, SUB_BY_KEY, type StyleKey } from '../taxonomy'
import { ai } from './client'
import { CLIP_GROUPS, type ClipGroup } from './prompts'

export interface ImageVariant {
  image: Blob
  thumb: Blob
  previewUrl: string
}

export interface ProcessedPhoto {
  cutout: ImageVariant | null
  original: ImageVariant
  suggestion: GarmentInput
  /** marca detectada por CLIP, si superó el umbral */
  brandGuess: string | null
  warnings: ('bg_failed' | 'tag_failed')[]
}

/**
 * Umbrales calibrados con fotos reales y el encoder de visión q8 (sus puntajes son algo más
 * planos que los de fp32): Levi's 0.97 y New Era 0.61 pasan; Superga → "Vans" 0.37 no.
 */
const BRAND_MIN = 0.5
/** Jean con luz cálida → denim 0.88; zapatillas azul marino → navy 0.50 */
const COLOR_MIN = 0.45
const STYLE_SECOND_MIN = 0.22

type Ranked = { label: string; score: number }[]
/** Devuelve la clave de taxonomía del puesto i del ranking de un grupo */
function keyAt(group: ClipGroup, r: Ranked, i = 0) {
  const g = CLIP_GROUPS[group]
  const hit = r[i]
  return hit ? { key: g.keys[g.prompts.indexOf(hit.label)] ?? null, score: hit.score } : null
}

async function variant(square: HTMLCanvasElement): Promise<ImageVariant> {
  const image = await toAlphaBlob(resizeTo(square, 900))
  const thumb = await toAlphaBlob(resizeTo(square, 400), 0.85)
  return { image, thumb, previewUrl: URL.createObjectURL(thumb) }
}

export async function processPhoto(file: File, lang: Lang): Promise<ProcessedPhoto> {
  const warnings: ProcessedPhoto['warnings'] = []
  const src = await loadScaled(file, 1024)
  const original = await variant(trimToSquare(src, 0.02))

  // 1) Quitar fondo
  let square: HTMLCanvasElement
  let cutout: ImageVariant | null = null
  try {
    const srcBlob = await toBlob(src, 'image/jpeg', 0.92)
    const mask = await ai.removeBackground(srcBlob)
    square = trimToSquare(applyAlpha(src, mask.alpha, mask.width, mask.height))
    cutout = await variant(square)
  } catch (e) {
    console.warn('[process] sin recorte', e)
    warnings.push('bg_failed')
    square = trimToSquare(src, 0.02)
  }

  // 2) Colores (píxeles opacos de una versión chica)
  const small = resizeTo(square, 72)
  let colors = dominantColors(ctx2d(small).getImageData(0, 0, small.width, small.height).data)

  // 3) Categoría, estilo, marca y color con CLIP sobre fondo blanco
  let subKey = 'tshirt'
  let styles: StyleKey[] = ['casual']
  let brandGuess: string | null = null
  try {
    const onWhite = await toBlob(resizeTo(square, 336, '#ffffff'), 'image/jpeg', 0.9)
    const groups = Object.fromEntries(Object.entries(CLIP_GROUPS).map(([k, g]) => [k, g.prompts]))
    const r = (await ai.classify(onWhite, groups)) as Record<ClipGroup, Ranked>

    const c0 = keyAt('color', r.color)
    colors = refineWithClip(colors, c0?.key ? { key: c0.key, score: c0.score } : null, COLOR_MIN)

    subKey = keyAt('sub', r.sub)?.key ?? subKey

    const s0 = keyAt('style', r.style)
    const s1 = keyAt('style', r.style, 1)
    if (s0?.key) styles = [s0.key as StyleKey]
    if (s0?.key && s1?.key && s1.score > STYLE_SECOND_MIN) styles.push(s1.key as StyleKey)

    const b0 = keyAt('brand', r.brand)
    if (b0?.key && b0.score >= BRAND_MIN) brandGuess = b0.key
  } catch (e) {
    console.warn('[process] sin etiquetas', e)
    warnings.push('tag_failed')
  }

  const def = SUB_BY_KEY[subKey]
  return {
    cutout,
    original,
    brandGuess,
    warnings,
    suggestion: {
      brand: brandGuess ?? '',
      description: autoDescription(subKey, colors[0], lang),
      category: def.category,
      subcategory: subKey,
      colors,
      styles,
      warmth: def.warmth,
      formality: def.formality,
    },
  }
}
