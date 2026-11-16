import { useTranslation } from 'react-i18next'
import type { Slot } from '../lib/outfits/engine'
import type { GarmentWithImage } from '../lib/store'
import { IconX } from './Icons'
import { cx, Sheet } from './ui'

const OPTIONAL: Slot[] = ['outerwear', 'headwear', 'eyewear', 'accessory']

/** Elegir otra prenda para un lugar del outfit. Las opciones vienen ordenadas por el motor. */
export function SwapSheet({
  slot,
  current,
  options,
  garments,
  onPick,
  onClose,
}: {
  slot: Slot | null
  current: string | undefined
  options: { id: string; score: number | null }[]
  garments: Map<string, GarmentWithImage>
  onPick: (id: string | null) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  if (!slot) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const slotName = t(`outfits.slots.${slot}`)

  return (
    <Sheet open onClose={onClose} title={t('outfits.swapTitle', { slot: slotName })}>
      {options.length === 0 ? (
        <p className="py-8 text-center text-[14px] text-muted">{t('outfits.swapEmpty')}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {OPTIONAL.includes(slot) && (
            <button
              type="button"
              onClick={() => onPick(null)}
              className={cx(
                'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[12px] text-muted',
                !current ? 'border-ink text-ink' : 'border-line',
              )}
            >
              <IconX size={20} />
              {t('outfits.swapRemove', { slot: slotName.toLowerCase() })}
            </button>
          )}
          {options.map(({ id, score }) => {
            const g = garments.get(id)
            if (!g) return null
            const bad = score === null
            return (
              <button key={id} type="button" onClick={() => onPick(id)} className="text-left">
                <div
                  className={cx(
                    'relative aspect-square overflow-hidden rounded-xl bg-tile ring-2 transition active:scale-95',
                    id === current ? 'ring-ink' : 'ring-transparent',
                  )}
                >
                  <img src={g.thumbUrl} alt="" className={cx('h-full w-full object-contain p-[10%]', bad && 'opacity-40')} />
                  {bad && (
                    <span className="absolute inset-x-1 bottom-1 rounded-full bg-bg/90 py-0.5 text-center text-[10.5px] font-medium text-muted">
                      {t('outfits.swapNoMatch')}
                    </span>
                  )}
                </div>
                <div className="truncate pt-1 text-[12px] font-semibold">{g.brand || t('common.unknownBrand')}</div>
                <div className="truncate text-[11.5px] text-muted">{g.description}</div>
              </button>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}
