import { COLORS } from './taxonomy'

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// sRGB → CIELAB para medir distancias de color como las percibe el ojo
function toLab([r, g, b]: RGB): RGB {
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

const PALETTE = COLORS.map((c) => ({ key: c.key, lab: toLab(hexToRgb(c.hex)) }))

function nearest(rgb: RGB) {
  const lab = toLab(rgb)
  let best = PALETTE[0]
  let bestD = Infinity
  for (const p of PALETTE) {
    const d = (p.lab[0] - lab[0]) ** 2 + (p.lab[1] - lab[1]) ** 2 + (p.lab[2] - lab[2]) ** 2
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best.key
}

/**
 * Colores dominantes de una imagen con transparencia. Agrupa los píxeles opacos con
 * k-means (k=4) y devuelve los nombres de la paleta ordenados por superficie,
 * descartando los que ocupan menos del 12 %.
 */
export function dominantColors(data: Uint8ClampedArray, maxColors = 2): string[] {
  const px: RGB[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 200) px.push([data[i], data[i + 1], data[i + 2]])
  }
  if (px.length < 20) return []

  const k = Math.min(4, px.length)
  let centers: RGB[] = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) * px.length) / k)])
  const assign = new Uint8Array(px.length)
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < px.length; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < k; c++) {
        const d = (px[i][0] - centers[c][0]) ** 2 + (px[i][1] - centers[c][1]) ** 2 + (px[i][2] - centers[c][2]) ** 2
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
    centers = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centers[c])) as RGB[]
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
