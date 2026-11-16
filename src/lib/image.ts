export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

export function ctx2d(c: HTMLCanvasElement) {
  return c.getContext('2d', { willReadFrequently: true })!
}

/** Carga un archivo de imagen respetando la orientación EXIF y lo limita a `max` px. */
export async function loadScaled(file: Blob, max = 1024): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = canvas(bmp.width * scale, bmp.height * scale)
  const g = ctx2d(c)
  g.imageSmoothingQuality = 'high'
  g.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close?.()
  return c
}

export function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falló'))), type, quality))
}

/** WebP con transparencia si el navegador lo sabe codificar; si no (Safari), PNG. */
export async function toAlphaBlob(c: HTMLCanvasElement, quality = 0.9) {
  const webp = await toBlob(c, 'image/webp', quality)
  return webp.type === 'image/webp' ? webp : toBlob(c, 'image/png')
}

/** Aplica una máscara alfa (mismo tamaño) sobre una copia del canvas. */
export function applyAlpha(src: HTMLCanvasElement, alpha: Uint8ClampedArray, aw: number, ah: number) {
  const out = canvas(src.width, src.height)
  const g = ctx2d(out)
  g.drawImage(src, 0, 0)
  const img = g.getImageData(0, 0, out.width, out.height)
  const sameSize = aw === out.width && ah === out.height
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const ax = sameSize ? x : Math.min(aw - 1, Math.floor((x * aw) / out.width))
      const ay = sameSize ? y : Math.min(ah - 1, Math.floor((y * ah) / out.height))
      let a = alpha[ay * aw + ax]
      if (a < 14) a = 0 // limpia el halo casi invisible
      img.data[(y * out.width + x) * 4 + 3] = a
    }
  }
  g.putImageData(img, 0, 0)
  return out
}

/** Recorta al contenido visible y lo centra en un cuadrado con margen. */
export function trimToSquare(src: HTMLCanvasElement, margin = 0.07, alphaThreshold = 24) {
  const g = ctx2d(src)
  const { data, width, height } = g.getImageData(0, 0, src.width, src.height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) {
    minX = 0
    minY = 0
    maxX = width - 1
    maxY = height - 1
  }
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const side = Math.ceil(Math.max(w, h) * (1 + margin * 2))
  const out = canvas(side, side)
  ctx2d(out).drawImage(src, minX, minY, w, h, (side - w) / 2, (side - h) / 2, w, h)
  return out
}

export function resizeTo(src: HTMLCanvasElement, size: number, background?: string) {
  const s = Math.min(size, src.width)
  const out = canvas(s, s * (src.height / src.width))
  const g = ctx2d(out)
  if (background) {
    g.fillStyle = background
    g.fillRect(0, 0, out.width, out.height)
  }
  g.imageSmoothingQuality = 'high'
  g.drawImage(src, 0, 0, out.width, out.height)
  return out
}
