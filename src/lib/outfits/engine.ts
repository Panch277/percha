/**
 * Motor de outfits por reglas. Puro (sin React ni E/S) para poder testearlo.
 *
 * Entrada: prendas, ocasión, clima del día, uso reciente y pesos de like/dislike.
 * Salida: N propuestas distintas, ordenadas por puntaje, con su etiqueta de estilo.
 *
 * Reglas "duras" (descartan): formalidad fuera de rango para la ocasión, prenda imposible para
 * el clima (short con frío, campera inflable con calor), dos estampados o 3+ acentos de color.
 * Reglas "blandas" (puntúan): cercanía a la formalidad ideal, coherencia de estilo, armonía de
 * color, abrigo adecuado, uso reciente y preferencias aprendidas.
 */
import { COLOR_BY_KEY, type CategoryKey, type StyleKey } from '../taxonomy.ts'

export type Occasion = 'casual' | 'night' | 'office' | 'sport'
export const OCCASIONS: Occasion[] = ['casual', 'night', 'office', 'sport']

/** Lugares del collage. "accessory" es solo el reloj. */
export type Slot = 'headwear' | 'eyewear' | 'outerwear' | 'top' | 'bottom' | 'footwear' | 'accessory'
export const SLOTS: Slot[] = ['headwear', 'eyewear', 'outerwear', 'top', 'bottom', 'footwear', 'accessory']
const REQUIRED: Slot[] = ['top', 'bottom', 'footwear']

export interface EngineGarment {
  id: string
  category: CategoryKey
  subcategory: string
  colors: string[]
  styles: StyleKey[]
  warmth: 1 | 2 | 3
  formality: 1 | 2 | 3
  pattern?: boolean
}

export interface Weather {
  /** °C */
  tMax: number
  tMin: number
  /** probabilidad de lluvia 0–100 */
  rainProb: number
}

/** Pesos aprendidos con like/dislike. Las claves de pares son "idA|idB" ordenados. */
export interface Prefs {
  items: Record<string, number>
  pairs: Record<string, number>
}
export const EMPTY_PREFS: Prefs = { items: {}, pairs: {} }

export type OutfitSlots = Partial<Record<Slot, string>>

export interface Proposal {
  slots: OutfitSlots
  style: StyleKey
  score: number
}

export interface EngineInput {
  garments: EngineGarment[]
  occasion: Occasion
  /** null = sin datos de clima: se asume un día templado */
  weather: Weather | null
  /** id de prenda → hace cuántos días se usó (planificada en el calendario) */
  recent?: Record<string, number>
  prefs?: Prefs
  count?: number
  seed?: number
}

export interface EngineResult {
  proposals: Proposal[]
  /** lugares obligatorios sin ninguna prenda posible (por ejemplo, no hay calzado formal) */
  missing: Slot[]
}

// ───────────────────────── Perfiles de ocasión ─────────────────────────

interface Profile {
  /** rango de formalidad permitido por defecto */
  range: [number, number]
  /** excepciones por lugar (por ejemplo, zapatillas a la noche) */
  rangeBySlot?: Partial<Record<Slot, [number, number]>>
  /** formalidad ideal (las prendas cercanas suman) */
  ideal: number
  /** estilos afines, en orden de preferencia */
  styles: StyleKey[]
  /** probabilidad de sumar cada opcional */
  optional: { headwear: number; eyewear: number; accessory: number }
}

export const PROFILES: Record<Occasion, Profile> = {
  casual: {
    range: [1, 2],
    rangeBySlot: { top: [1, 3], accessory: [1, 3], eyewear: [1, 3] },
    ideal: 1.5,
    styles: ['casual', 'street', 'minimal'],
    optional: { headwear: 0.35, eyewear: 0.3, accessory: 0.4 },
  },
  night: {
    range: [2, 3],
    rangeBySlot: { footwear: [1, 3], headwear: [1, 2], eyewear: [1, 3] },
    ideal: 2.3,
    styles: ['smart', 'street', 'minimal'],
    optional: { headwear: 0.15, eyewear: 0, accessory: 0.6 },
  },
  office: {
    range: [2, 3],
    ideal: 2.7,
    styles: ['smart', 'formal', 'minimal'],
    optional: { headwear: 0, eyewear: 0, accessory: 0.7 },
  },
  sport: {
    range: [1, 1],
    rangeBySlot: { outerwear: [1, 2], accessory: [1, 3], eyewear: [1, 3], headwear: [1, 2] },
    ideal: 1,
    styles: ['athleisure', 'casual', 'street'],
    optional: { headwear: 0.5, eyewear: 0.3, accessory: 0.4 },
  },
}

// ───────────────────────── Utilidades ─────────────────────────

/** RNG determinístico (mulberry32): misma semilla → mismas propuestas */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Semilla a partir de un texto (fecha + ocasión) */
export function seedFrom(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function slotOf(g: EngineGarment): Slot | null {
  if (g.category === 'accessory') return g.subcategory === 'watch' ? 'accessory' : null
  return g.category
}

export function outfitIds(slots: OutfitSlots) {
  return SLOTS.map((s) => slots[s]).filter((x): x is string => !!x)
}

export function outfitKey(slots: OutfitSlots) {
  return [...outfitIds(slots)].sort().join(',')
}

// ───────────────────────── Clima ─────────────────────────

const MILD: Weather = { tMax: 21, tMin: 13, rainProb: 0 }

/** ¿La prenda es posible con este clima? */
export function weatherAllows(g: EngineGarment, w: Weather): boolean {
  const s = g.subcategory
  if (s === 'shorts' && w.tMax < 22) return false
  if (s === 'tank' && w.tMax < 24) return false
  if (s === 'sandals' && (w.tMax < 24 || w.rainProb >= 50)) return false
  if (s === 'beanie' && w.tMax >= 14) return false
  if (s === 'sunglasses' && w.rainProb >= 40) return false
  if (g.category === 'top' && g.warmth >= 2 && w.tMax >= 27) return false
  if (g.category === 'outerwear') {
    if (w.tMax >= 25 && w.rainProb < 50) return false
    if (g.warmth === 3 && w.tMax >= 17) return false
  }
  if (g.category === 'footwear' && g.warmth === 3 && w.tMax >= 26) return false
  return true
}

/** ¿Hace falta abrigo? 'required' | 'optional' | 'none' */
export function outerwearNeed(w: Weather): 'required' | 'optional' | 'none' {
  if (w.tMin < 14 || w.tMax < 19 || w.rainProb >= 50) return 'required'
  if (w.tMax >= 25) return 'none'
  return w.tMin < 18 ? 'optional' : 'none'
}

/** Puntaje de abrigo: cuánto encaja la prenda con la temperatura */
function warmthScore(g: EngineGarment, w: Weather): number {
  let s = 0
  if (g.category === 'outerwear') {
    // ideal: 3 con mucho frío, 2 en media estación
    const ideal = w.tMax < 12 ? 3 : 2
    s -= Math.abs(g.warmth - ideal) * 0.8
  }
  if (g.category === 'top') {
    const ideal = w.tMax < 15 ? 2 : 1
    s -= Math.abs(g.warmth - ideal) * 0.4
  }
  if (g.category === 'bottom' && g.subcategory === 'shorts' && w.tMax >= 28) s += 0.6
  if (g.subcategory === 'boots' && (w.rainProb >= 50 || w.tMax < 12)) s += 0.8
  return s
}

// ───────────────────────── Color ─────────────────────────

/** El jean se comporta como neutro */
export function isNeutral(color: string | undefined) {
  if (!color) return true
  return color === 'denim' || !!COLOR_BY_KEY[color]?.neutral
}

/** Pares de acentos que chocan (orden indistinto) */
const CLASHES = new Set(
  [
    ['red', 'pink'],
    ['red', 'orange'],
    ['red', 'purple'],
    ['red', 'green'],
    ['red', 'burgundy'],
    ['orange', 'pink'],
    ['orange', 'purple'],
    ['orange', 'burgundy'],
    ['burgundy', 'pink'],
    ['green', 'olive'],
    ['yellow', 'pink'],
    ['blue', 'purple'],
  ].map(([a, b]) => pairKey(a, b)),
)

export function colorsClash(a: string, b: string) {
  return CLASHES.has(pairKey(a, b))
}

/** Lugares que cuentan para la armonía (lo chico, lentes y reloj, no) */
const VISIBLE: Slot[] = ['headwear', 'outerwear', 'top', 'bottom', 'footwear']

/**
 * Armonía de color: null si el conjunto se descarta, si no un puntaje.
 * Neutros + como mucho 2 acentos que no choquen; como mucho 1 estampado
 * (y con estampado, como mucho 1 acento liso aparte).
 */
export function harmony(items: EngineGarment[]): number | null {
  const accents = new Set<string>()
  let patterned = 0
  for (const g of items) {
    if (g.pattern) patterned++
    const main = g.colors[0]
    if (!isNeutral(main)) accents.add(main)
  }
  if (patterned > 1) return null
  const list = [...accents]
  if (list.length > 2) return null
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (colorsClash(list[i], list[j])) return null
  if (patterned === 1 && list.length > 1) return null

  let s = 0
  if (list.length === 0) s += 0.6 // todo neutro: siempre funciona
  if (list.length === 1) s += 1 // un toque de color
  if (list.length === 2) s -= 0.4
  // repetir un acento en dos prendas queda prolijo
  const mains = items.map((g) => g.colors[0]).filter((c) => !isNeutral(c))
  if (mains.length > list.length) s += 0.4
  return s
}

// ───────────────────────── Estilo ─────────────────────────

/** Etiqueta de estilo: el más frecuente entre las prendas principales; desempata la ocasión */
export function styleOf(items: EngineGarment[], occasion: Occasion): { style: StyleKey; coherence: number } {
  const prof = PROFILES[occasion]
  const count = new Map<StyleKey, number>()
  for (const g of items) for (const s of g.styles) count.set(s, (count.get(s) ?? 0) + 1)
  let best: StyleKey = prof.styles[0]
  let bestN = -1
  for (const [s, n] of count) {
    const bonus = prof.styles.includes(s) ? 0.5 - prof.styles.indexOf(s) * 0.1 : 0
    if (n + bonus > bestN) {
      best = s
      bestN = n + bonus
    }
  }
  const n = count.get(best) ?? 0
  return { style: best, coherence: items.length ? n / items.length : 0 }
}

// ───────────────────────── Candidatos ─────────────────────────

function inRange(g: EngineGarment, slot: Slot, occasion: Occasion, widen = 0) {
  const p = PROFILES[occasion]
  const [lo, hi] = p.rangeBySlot?.[slot] ?? p.range
  return g.formality >= lo - widen && g.formality <= hi + widen
}

export interface Context {
  occasion: Occasion
  weather: Weather
  recent: Record<string, number>
  prefs: Prefs
}

/** Prendas posibles por lugar. Si un obligatorio queda vacío, se afloja la formalidad un punto. */
export function candidates(garments: EngineGarment[], ctx: Context) {
  const pools = {} as Record<Slot, EngineGarment[]>
  for (const slot of SLOTS) pools[slot] = []
  for (const g of garments) {
    const slot = slotOf(g)
    if (slot && weatherAllows(g, ctx.weather) && inRange(g, slot, ctx.occasion)) pools[slot].push(g)
  }
  for (const slot of REQUIRED) {
    if (pools[slot].length) continue
    pools[slot] = garments.filter((g) => slotOf(g) === slot && weatherAllows(g, ctx.weather) && inRange(g, slot, ctx.occasion, 1))
  }
  return pools
}

const RECENT_DAYS = 7

/** Puntaje de un conjunto armado. null = inválido. */
export function scoreOutfit(items: EngineGarment[], ctx: Context): number | null {
  const visible = items.filter((g) => VISIBLE.includes(slotOf(g)!))
  const h = harmony(visible)
  if (h === null) return null
  const prof = PROFILES[ctx.occasion]
  let s = h

  const main = items.filter((g) => slotOf(g) !== 'eyewear' && slotOf(g) !== 'accessory')
  // formalidad: cerca del ideal de la ocasión
  for (const g of main) s -= Math.abs(g.formality - prof.ideal) * 0.5
  // coherencia de estilo, y bonus si es afín a la ocasión
  const { style, coherence } = styleOf(main, ctx.occasion)
  s += coherence * 1.5
  if (prof.styles.includes(style)) s += 0.5
  // clima
  for (const g of items) s += warmthScore(g, ctx.weather)
  // uso reciente
  for (const g of items) {
    const d = ctx.recent[g.id]
    if (d !== undefined && d < RECENT_DAYS) s -= 2 * (1 - d / RECENT_DAYS)
  }
  // preferencias aprendidas (acotadas para que un like no domine todo)
  const clamp = (x: number) => Math.max(-4, Math.min(4, x))
  for (const g of items) s += clamp(ctx.prefs.items[g.id] ?? 0) * 0.5
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) s += clamp(ctx.prefs.pairs[pairKey(items[i].id, items[j].id)] ?? 0) * 0.6
  return s
}

// ───────────────────────── Generación ─────────────────────────

const TRIALS = 600

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
}

export function generate(input: EngineInput): EngineResult {
  const ctx: Context = {
    occasion: input.occasion,
    weather: input.weather ?? MILD,
    recent: input.recent ?? {},
    prefs: input.prefs ?? EMPTY_PREFS,
  }
  const count = input.count ?? 6
  const r = rng(input.seed ?? 1)
  const pools = candidates(input.garments, ctx)
  const missing = REQUIRED.filter((s) => !pools[s].length)
  if (missing.length) return { proposals: [], missing }

  const prof = PROFILES[ctx.occasion]
  const need = outerwearNeed(ctx.weather)
  const byId = new Map(input.garments.map((g) => [g.id, g]))

  // 1) muestreo aleatorio de combinaciones válidas, sin repetir
  const seen = new Map<string, Proposal>()
  for (let t = 0; t < TRIALS; t++) {
    const slots: OutfitSlots = {}
    for (const s of REQUIRED) slots[s] = pick(pools[s], r).id
    if (pools.outerwear.length && (need === 'required' || (need === 'optional' && r() < 0.5))) slots.outerwear = pick(pools.outerwear, r).id
    for (const s of ['headwear', 'eyewear', 'accessory'] as const) if (pools[s].length && r() < prof.optional[s]) slots[s] = pick(pools[s], r).id

    const key = outfitKey(slots)
    if (seen.has(key)) continue
    const items = outfitIds(slots).map((id) => byId.get(id)!)
    const score = scoreOutfit(items, ctx)
    if (score === null) continue
    const main = items.filter((g) => slotOf(g) !== 'eyewear' && slotOf(g) !== 'accessory')
    // un poco de ruido para que dos días iguales no den siempre lo mismo
    seen.set(key, { slots, style: styleOf(main, ctx.occasion).style, score: score + (r() - 0.5) * 0.6 })
  }

  // 2) selección golosa con diversidad: no repetir arriba+abajo, y penalizar prendas ya usadas
  const pool = [...seen.values()].sort((a, b) => b.score - a.score)
  const chosen: Proposal[] = []
  const used = new Map<string, number>()
  const combos = new Set<string>()
  while (chosen.length < count && pool.length) {
    let bestI = -1
    let bestS = -Infinity
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i]
      if (combos.has(`${p.slots.top}+${p.slots.bottom}`)) continue
      const reuse = outfitIds(p.slots).reduce((acc, id) => acc + (used.get(id) ?? 0), 0)
      const s = p.score - reuse * 0.7
      if (s > bestS) {
        bestS = s
        bestI = i
      }
    }
    if (bestI < 0) break
    const [p] = pool.splice(bestI, 1)
    chosen.push(p)
    combos.add(`${p.slots.top}+${p.slots.bottom}`)
    for (const id of outfitIds(p.slots)) used.set(id, (used.get(id) ?? 0) + 1)
  }
  return { proposals: chosen, missing: [] }
}

/** Alternativas para cambiar una prenda del outfit, ordenadas por cómo queda el conjunto */
export function swapOptions(
  garments: EngineGarment[],
  slots: OutfitSlots,
  slot: Slot,
  input: Pick<EngineInput, 'occasion' | 'weather' | 'recent' | 'prefs'>,
): { id: string; score: number | null }[] {
  const ctx: Context = {
    occasion: input.occasion,
    weather: input.weather ?? MILD,
    recent: input.recent ?? {},
    prefs: input.prefs ?? EMPTY_PREFS,
  }
  const byId = new Map(garments.map((g) => [g.id, g]))
  return garments
    .filter((g) => slotOf(g) === slot)
    .map((g) => {
      const next = { ...slots, [slot]: g.id }
      const items = outfitIds(next).map((id) => byId.get(id)!).filter(Boolean)
      return { id: g.id, score: scoreOutfit(items, ctx) }
    })
    .sort((a, b) => (b.score ?? -99) - (a.score ?? -99))
}

/** Aplica un like (+1) o dislike (-1). Pura: devuelve pesos nuevos. */
export function applyFeedback(prefs: Prefs, ids: string[], vote: 1 | -1): Prefs {
  const items = { ...prefs.items }
  const pairs = { ...prefs.pairs }
  // el dislike suele ser por la combinación, no por cada prenda: pesa menos en las prendas
  const itemDelta = vote === 1 ? 1 : -0.5
  for (const id of ids) items[id] = (items[id] ?? 0) + itemDelta
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const k = pairKey(ids[i], ids[j])
      pairs[k] = (pairs[k] ?? 0) + vote
    }
  return { items, pairs }
}
