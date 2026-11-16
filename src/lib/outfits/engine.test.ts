import { describe, expect, it } from 'vitest'
import { SUB_BY_KEY } from '../taxonomy.ts'
import {
  applyFeedback,
  colorsClash,
  type EngineGarment,
  generate,
  harmony,
  outerwearNeed,
  outfitIds,
  outfitKey,
  pairKey,
  swapOptions,
  type Weather,
  weatherAllows,
} from './engine.ts'

/** Prenda de prueba con los valores por defecto de la taxonomía */
function g(id: string, sub: string, colors: string[], extra: Partial<EngineGarment> = {}): EngineGarment {
  const d = SUB_BY_KEY[sub]
  return { id, category: d.category, subcategory: sub, colors, styles: ['casual'], warmth: d.warmth, formality: d.formality, ...extra }
}

const HOT: Weather = { tMax: 31, tMin: 22, rainProb: 0 }
const MILD: Weather = { tMax: 21, tMin: 15, rainProb: 0 }
const COLD: Weather = { tMax: 9, tMin: 2, rainProb: 10 }
const RAINY: Weather = { tMax: 18, tMin: 12, rainProb: 80 }

const CLOSET: EngineGarment[] = [
  g('tee-white', 'tshirt', ['white']),
  g('tee-black', 'tshirt', ['black']),
  g('tee-red', 'tshirt', ['red']),
  g('polo-navy', 'polo', ['navy'], { styles: ['smart'] }),
  g('shirt-lb', 'shirt', ['lightblue'], { styles: ['smart', 'formal'] }),
  g('shirt-white', 'shirt', ['white'], { styles: ['formal'] }),
  g('hoodie-gray', 'hoodie', ['gray'], { styles: ['athleisure', 'street'] }),
  g('knit-cream', 'knit', ['cream'], { styles: ['smart'] }),
  g('jeans', 'jeans', ['denim']),
  g('chinos', 'pants', ['beige'], { styles: ['smart'] }),
  g('joggers', 'joggers', ['black'], { styles: ['athleisure'] }),
  g('shorts', 'shorts', ['navy'], { styles: ['athleisure'] }),
  g('sneakers', 'sneakers', ['white']),
  g('runners', 'sneakers', ['gray'], { styles: ['athleisure'] }),
  g('loafers', 'shoes', ['brown'], { styles: ['formal'] }),
  g('boots', 'boots', ['brown']),
  g('jacket', 'jacket', ['olive']),
  g('puffer', 'puffer', ['black']),
  g('blazer', 'blazer', ['navy'], { styles: ['formal', 'smart'] }),
  g('cap', 'cap', ['black'], { styles: ['athleisure'] }),
  g('beanie', 'beanie', ['charcoal']),
  g('shades', 'sunglasses', ['black']),
  g('watch', 'watch', ['silver']),
  g('socks', 'socks', ['white']),
]
const byId = new Map(CLOSET.map((x) => [x.id, x]))

function all(occasion: Parameters<typeof generate>[0]['occasion'], weather: Weather | null, seed = 7) {
  return generate({ garments: CLOSET, occasion, weather, seed, count: 8 })
}

describe('clima', () => {
  it('short solo con calor', () => {
    expect(weatherAllows(byId.get('shorts')!, HOT)).toBe(true)
    expect(weatherAllows(byId.get('shorts')!, MILD)).toBe(false)
  })
  it('campera inflable solo con frío, gorro de lana solo con frío', () => {
    expect(weatherAllows(byId.get('puffer')!, COLD)).toBe(true)
    expect(weatherAllows(byId.get('puffer')!, MILD)).toBe(false)
    expect(weatherAllows(byId.get('beanie')!, HOT)).toBe(false)
  })
  it('lentes de sol no con lluvia', () => {
    expect(weatherAllows(byId.get('shades')!, RAINY)).toBe(false)
  })
  it('abrigo obligatorio con frío o lluvia, nada con calor', () => {
    expect(outerwearNeed(COLD)).toBe('required')
    expect(outerwearNeed(RAINY)).toBe('required')
    expect(outerwearNeed(HOT)).toBe('none')
  })
  it('con frío todas las propuestas llevan abrigo y ninguna short', () => {
    const { proposals } = all('casual', COLD)
    expect(proposals.length).toBeGreaterThan(0)
    for (const p of proposals) {
      expect(p.slots.outerwear).toBeDefined()
      expect(p.slots.bottom).not.toBe('shorts')
    }
  })
  it('con calor no hay abrigo ni buzo', () => {
    for (const p of all('casual', HOT).proposals) {
      expect(p.slots.outerwear).toBeUndefined()
      expect(p.slots.top).not.toBe('hoodie-gray')
    }
  })
})

describe('ocasión', () => {
  it('siempre trae arriba, abajo y calzado', () => {
    for (const occ of ['casual', 'night', 'office', 'sport'] as const)
      for (const p of all(occ, MILD).proposals) {
        expect(p.slots.top).toBeDefined()
        expect(p.slots.bottom).toBeDefined()
        expect(p.slots.footwear).toBeDefined()
      }
  })
  it('oficina: nada deportivo', () => {
    const { proposals } = all('office', MILD)
    expect(proposals.length).toBeGreaterThan(0)
    for (const p of proposals) {
      for (const id of outfitIds(p.slots)) expect(byId.get(id)!.formality).toBeGreaterThanOrEqual(2)
      expect(p.slots.headwear).toBeUndefined()
    }
  })
  it('deporte: estilo athleisure y prendas deportivas', () => {
    const { proposals } = all('sport', HOT)
    expect(proposals.length).toBeGreaterThan(0)
    for (const p of proposals) {
      expect(['joggers', 'shorts']).toContain(p.slots.bottom)
      expect(byId.get(p.slots.footwear!)!.subcategory).toBe('sneakers')
    }
    expect(proposals.some((p) => p.style === 'athleisure')).toBe(true)
  })
  it('las medias no entran nunca al outfit', () => {
    for (const p of all('casual', MILD).proposals) expect(outfitIds(p.slots)).not.toContain('socks')
  })
  it('avisa qué falta si no hay calzado posible', () => {
    const r = generate({ garments: CLOSET.filter((x) => x.category !== 'footwear'), occasion: 'casual', weather: MILD })
    expect(r.proposals).toEqual([])
    expect(r.missing).toEqual(['footwear'])
  })
  it('afloja la formalidad si no hay nada en rango', () => {
    // solo hay zapatillas (formalidad 1) y se pide oficina (2–3): se aceptan igual
    const closet = CLOSET.filter((x) => x.category !== 'footwear' || x.id === 'sneakers')
    const r = generate({ garments: closet, occasion: 'office', weather: MILD })
    expect(r.missing).toEqual([])
    expect(r.proposals[0].slots.footwear).toBe('sneakers')
  })
})

describe('color', () => {
  it('detecta choques en cualquier orden', () => {
    expect(colorsClash('red', 'pink')).toBe(true)
    expect(colorsClash('pink', 'red')).toBe(true)
    expect(colorsClash('navy', 'red')).toBe(false)
  })
  it('neutros + 1 acento suma más que todo neutro', () => {
    const neutral = harmony([g('a', 'tshirt', ['white']), g('b', 'jeans', ['denim'])])!
    const oneAccent = harmony([g('a', 'tshirt', ['red']), g('b', 'jeans', ['denim'])])!
    expect(oneAccent).toBeGreaterThan(neutral)
  })
  it('descarta 3 acentos, acentos que chocan y dos estampados', () => {
    expect(harmony([g('a', 'tshirt', ['red']), g('b', 'pants', ['green']), g('c', 'sneakers', ['yellow'])])).toBeNull()
    expect(harmony([g('a', 'tshirt', ['red']), g('b', 'pants', ['pink'])])).toBeNull()
    expect(harmony([g('a', 'tshirt', ['white'], { pattern: true }), g('b', 'pants', ['beige'], { pattern: true })])).toBeNull()
  })
  it('un estampado admite neutros pero no dos acentos más', () => {
    expect(harmony([g('a', 'shirt', ['blue'], { pattern: true }), g('b', 'pants', ['beige'])])).not.toBeNull()
    expect(harmony([g('a', 'shirt', ['blue'], { pattern: true }), g('b', 'pants', ['olive']), g('c', 'sneakers', ['yellow'])])).toBeNull()
  })
})

describe('variedad y preferencias', () => {
  it('misma semilla → mismas propuestas; otra semilla → otras', () => {
    const a = all('casual', MILD, 1).proposals.map((p) => outfitKey(p.slots))
    const b = all('casual', MILD, 1).proposals.map((p) => outfitKey(p.slots))
    const c = all('casual', MILD, 2).proposals.map((p) => outfitKey(p.slots))
    expect(a).toEqual(b)
    expect(c).not.toEqual(a)
  })
  it('sin combinaciones repetidas ni el mismo arriba+abajo dos veces', () => {
    const ps = all('casual', MILD).proposals
    expect(new Set(ps.map((p) => outfitKey(p.slots))).size).toBe(ps.length)
    expect(new Set(ps.map((p) => `${p.slots.top}+${p.slots.bottom}`)).size).toBe(ps.length)
  })
  it('respeta la cantidad pedida', () => {
    expect(generate({ garments: CLOSET, occasion: 'casual', weather: MILD, count: 3 }).proposals).toHaveLength(3)
  })
  it('like suma a prendas y pares; dislike resta más al par que a las prendas', () => {
    let p = applyFeedback({ items: {}, pairs: {} }, ['a', 'b'], 1)
    expect(p.items).toEqual({ a: 1, b: 1 })
    expect(p.pairs[pairKey('a', 'b')]).toBe(1)
    p = applyFeedback(p, ['a', 'b'], -1)
    expect(p.items.a).toBe(0.5)
    expect(p.pairs[pairKey('a', 'b')]).toBe(0)
  })
  it('una prenda con muchos likes aparece más; una usada ayer, menos', () => {
    const count = (prefs?: Parameters<typeof generate>[0]['prefs'], recent?: Record<string, number>) => {
      let n = 0
      for (let seed = 1; seed <= 30; seed++)
        for (const p of generate({ garments: CLOSET, occasion: 'casual', weather: MILD, seed, prefs, recent, count: 4 }).proposals)
          if (p.slots.top === 'tee-red') n++
      return n
    }
    const base = count()
    expect(count({ items: { 'tee-red': 4 }, pairs: {} })).toBeGreaterThan(base)
    expect(count(undefined, { 'tee-red': 1 })).toBeLessThan(base)
  })
  it('swapOptions ordena alternativas de la misma categoría y marca las inválidas', () => {
    const slots = { top: 'tee-red', bottom: 'jeans', footwear: 'sneakers' }
    const opts = swapOptions(CLOSET, slots, 'bottom', { occasion: 'casual', weather: MILD })
    expect(opts.map((o) => o.id).sort()).toEqual(['chinos', 'jeans', 'joggers', 'shorts'])
    expect(opts[0].score).not.toBeNull()
  })
})
