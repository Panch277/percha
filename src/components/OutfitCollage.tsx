import type { OutfitSlots, Slot } from '../lib/outfits/engine'
import type { GarmentWithImage } from '../lib/store'
import { cx } from './ui'

/** Caja cuadrada: x, y y lado en % del ancho del lienzo (el alto es 1.25 × ancho) */
type Box = { x: number; y: number; s: number; z?: number }

/**
 * Layout estándar, como el collage de Alta: a la izquierda arriba, abajo y calzado; a la derecha
 * gorra, lentes y reloj. Si hay abrigo, va detrás del top. Sin accesorios, la columna se centra.
 * Las fotos son cuadradas con fondo transparente y margen, así que las cajas son cuadradas y se
 * pueden pisar un poco sin que se note.
 */
function layout(slots: OutfitSlots): Partial<Record<Slot, Box>> {
  const side = !!(slots.headwear || slots.eyewear || slots.accessory)
  const coat = !!slots.outerwear
  if (side)
    return {
      ...(coat ? { outerwear: { x: -2, y: 1, s: 50 }, top: { x: 20, y: 8, s: 42, z: 2 } } : { top: { x: 2, y: 0, s: 56, z: 2 } }),
      bottom: { x: 4, y: 46, s: 52 },
      footwear: { x: 8, y: 84, s: 40 },
      headwear: { x: 60, y: 5, s: 36 },
      eyewear: { x: 60, y: 48, s: 36 },
      accessory: { x: 64, y: 84, s: 30 },
    }
  return {
    ...(coat ? { outerwear: { x: 8, y: 1, s: 52 }, top: { x: 42, y: 10, s: 46, z: 2 } } : { top: { x: 20, y: 0, s: 60, z: 2 } }),
    bottom: { x: 22, y: 46, s: 56 },
    footwear: { x: 28, y: 82, s: 44 },
  }
}

export function OutfitCollage({
  slots,
  garments,
  className,
  onSlot,
  activeSlot,
  compact,
}: {
  slots: OutfitSlots
  garments: Map<string, GarmentWithImage>
  className?: string
  /** miniatura (calendario): solo la columna principal, sin gorra/lentes/reloj, para que se vea más grande */
  compact?: boolean
  /** si se pasa, cada prenda es tocable (modo edición) */
  onSlot?: (s: Slot) => void
  activeSlot?: Slot | null
}) {
  // solo las prendas que siguen existiendo en el clóset
  const present: OutfitSlots = {}
  for (const [s, id] of Object.entries(slots) as [Slot, string][]) {
    if (compact && (s === 'headwear' || s === 'eyewear' || s === 'accessory')) continue
    if (id && garments.has(id)) present[s] = id
  }
  const boxes = layout(present)

  return (
    <div className={cx('relative aspect-[4/5] w-full overflow-hidden bg-tile', className)}>
      {(Object.entries(boxes) as [Slot, Box][]).map(([s, b]) => {
        const id = present[s]
        if (!id) return null
        const g = garments.get(id)!
        // y está en % del ancho: el alto del lienzo es 125 % del ancho
        const style = { left: `${b.x}%`, top: `${b.y / 1.25}%`, width: `${b.s}%`, aspectRatio: '1', zIndex: b.z ?? 1 }
        const img = <img src={g.thumbUrl} alt={g.description} draggable={false} className="h-full w-full object-contain" />
        return onSlot ? (
          <button
            key={s}
            type="button"
            onClick={() => onSlot(s)}
            style={style}
            aria-label={g.description}
            className={cx(
              // las cajas se pisan (fondo transparente), así que no llevan borde: se marca al pasar
              // o la activa. El tile es claro también en oscuro, por eso el negro translúcido.
              'absolute rounded-2xl transition active:scale-95',
              activeSlot === s ? 'ring-2 ring-accent' : 'hover:bg-black/5',
            )}
          >
            {img}
          </button>
        ) : (
          <div key={s} style={style} className="absolute">
            {img}
          </div>
        )
      })}
    </div>
  )
}
