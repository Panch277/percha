import { COLORS } from './taxonomy'

type RGB = [number, number, number]
type Lab = [number, number, number]

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// sRGB → CIELAB para medir distancias de color como las percibe el ojo
function toLab([r, g, b]: RGB): Lab {
  const lin = (c: number) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const R = lin(r)
  const G = lin(g)
  const B = lin(b)
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

const dist2 = (a: Lab, b: Lab) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

const PALETTE = COLORS.map((c) => ({ key: c.key, lab: toLab(hexToRgb(c.hex)) }))
const LAB_BY_KEY = Object.fromEntries(PALETTE.map((p) => [p.key, p.lab])) as Record<string, Lab>

function nearest(lab: Lab) {
  let best = PALETTE[0]
  let bestD = Infinity
  for (const p of PALETTE) {
    const d = dist2(p.lab, lab)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best.key
}

/** Distancia perceptual (ΔE76) entre dos colores de la paleta */
export function paletteDistance(a: string, b: string) {
  const la = LAB_BY_KEY[a]
  const lb = LAB_BY_KEY[b]
  return la && lb ? Math.sqrt(dist2(la, lb)) : Infinity
}

/**
 * Colores dominantes de una imagen con transparencia. Agrupa los píxeles opacos con
 * k-means (k=4) en CIELAB y devuelve los nombres de la paleta ordenados por superficie,
 * descartando los que ocupan menos del 12 %.
 */
export function dominantColors(data: Uint8ClampedArray, maxColors = 2): string[] {
  const px: Lab[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 200) px.push(toLab([data[i], data[i + 1], data[i + 2]]))
  }
  if (px.length < 20) return []

  const k = Math.min(4, px.length)
  let centers: Lab[] = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) * px.length) / k)])
  const assign = new Uint8Array(px.length)
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < k; c++) {
        const d = dist2(px[i], centers[c])
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      assign[i] = best
    }
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0])
    for (let i = 0; i < px.length; i++) {
      const s = sums[assign[i]]
      s[0] += px[i][0]
      s[1] += px[i][1]
      s[2] += px[i][2]
      s[3]++
    }
    centers = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[c])) as Lab[]
  }

  const counts = new Array(k).fill(0)
  for (let i = 0; i < px.length; i++) counts[assign[i]]++

  const byName = new Map<string, number>()
  centers.forEach((c, i) => {
    const name = nearest(c)
    byName.set(name, (byName.get(name) ?? 0) + counts[i])
  })
  return [...byName.entries()]
    .filter(([, n]) => n / px.length >= 0.12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxColors)
    .map(([name]) => name)
}

/**
 * Corrige el color dominante con la opinión de CLIP. Los píxeles dependen mucho de la luz
 * (un jean con luz cálida da gris, unas zapatillas azul marino dan negro), y CLIP es más
 * robusto al balance de blancos. Solo se acepta el cambio si CLIP está seguro y su color es
 * vecino del medido, así CLIP no puede inventar un color que no está en la foto.
 */
export function refineWithClip(colors: string[], clipTop: { key: string; score: number } | null, minScore = 0.6, maxDelta = 35) {
  if (!clipTop || !colors.length || clipTop.score < minScore) return colors
  if (colors[0] === clipTop.key || paletteDistance(colors[0], clipTop.key) > maxDelta) return colors
  return [clipTop.key, ...colors.slice(1).filter((c) => c !== clipTop.key)]
}
