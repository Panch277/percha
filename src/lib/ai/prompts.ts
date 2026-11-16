/**
 * Prompts de CLIP para el auto-etiquetado. Los embeddings de texto de estos prompts se
 * precalculan con `npm run clip:embed` (fp32) y se guardan en clip-text-embeddings.json,
 * así el navegador solo baja el modelo de visión. Si cambiás un prompt o la taxonomía,
 * volvé a correr ese script (hay un test que lo verifica).
 *
 * Usa imports con extensión .ts porque también lo ejecuta Node directamente.
 */
import { COLORS, KNOWN_BRANDS, STYLES, SUBCATEGORIES } from '../taxonomy.ts'

export const CLIP_MODEL = 'Xenova/clip-vit-base-patch32'

export const NO_LOGO = 'a plain clothing item with no visible logo'

export interface PromptGroup {
  /** clave de taxonomía (o null para "sin logo") por cada prompt */
  keys: (string | null)[]
  prompts: string[]
}

export const CLIP_GROUPS = {
  sub: { keys: SUBCATEGORIES.map((s) => s.key), prompts: SUBCATEGORIES.map((s) => `a product photo of ${s.prompt}`) },
  style: { keys: STYLES.map((s) => s.key), prompts: STYLES.map((s) => `a photo of ${s.prompt}`) },
  brand: {
    keys: [...KNOWN_BRANDS, null],
    prompts: [...KNOWN_BRANDS.map((b) => `a product with the ${b} logo`), NO_LOGO],
  },
  color: { keys: COLORS.map((c) => c.key), prompts: COLORS.map((c) => `a ${c.clip} piece of clothing`) },
  pattern: {
    keys: ['plain', 'pattern'],
    prompts: [
      'a plain solid-colored piece of clothing with no print',
      'a piece of clothing with an all-over print, stripes, checks or a large graphic',
    ],
  },
} satisfies Record<string, PromptGroup>

export type ClipGroup = keyof typeof CLIP_GROUPS

export function allPrompts() {
  return [...new Set(Object.values(CLIP_GROUPS).flatMap((g) => g.prompts))]
}
