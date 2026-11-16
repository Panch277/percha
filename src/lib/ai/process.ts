import { dominantColors } from '../color'
import { applyAlpha, ctx2d, loadScaled, resizeTo, toAlphaBlob, toBlob, trimToSquare } from '../image'
import type { GarmentInput } from '../store/types'
import { autoDescription, KNOWN_BRANDS, type Lang, STYLES, SUB_BY_KEY, SUBCATEGORIES, type StyleKey } from '../taxonomy'
import { ai } from './client'

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

const NO_LOGO = 'a plain clothing item with no visible logo'

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
  const colors = dominantColors(ctx2d(small).getImageData(0, 0, small.width, small.height).data)

  // 3) Categoría, estilo y marca con CLIP sobre fondo blanco
  let subKey = 'tshirt'
  let styles: StyleKey[] = ['casual']
  let brandGuess: string | null = null
  try {
    const onWhite = await toBlob(resizeTo(square, 336, '#ffffff'), 'image/jpeg', 0.9)
    const subPrompts = SUBCATEGORIES.map((s) => `a product photo of ${s.prompt}`)
    const stylePrompts = STYLES.map((s) => `a photo of ${s.prompt}`)
    const brandPrompts = [...KNOWN_BRANDS.map((b) => `a product with the ${b} logo`), NO_LOGO]
    const r = await ai.classify(onWhite, { sub: subPrompts, style: stylePrompts, brand: brandPrompts })

    const sub = r.sub[0]
    subKey = SUBCATEGORIES[subPrompts.indexOf(sub.label)]?.key ?? subKey

    const st = r.style
    styles = [STYLES[stylePrompts.indexOf(st[0].label)].key]
    if (st[1] && st[1].score > 0.22) styles.push(STYLES[stylePrompts.indexOf(st[1].label)].key)

    const br = r.brand[0]
    if (br.label !== NO_LOGO && br.score >= 0.3) brandGuess = KNOWN_BRANDS[brandPrompts.indexOf(br.label)] ?? null
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
