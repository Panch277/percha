import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fmtDate } from '../lib/calendar'
import { useOutfits } from '../lib/outfits/context'
import { slotsFromIds } from '../lib/outfits/engine'
import type { GarmentWithImage, Outfit } from '../lib/store'
import type { Lang } from '../lib/taxonomy'
import { IconCalendar, IconTrash } from './Icons'
import { styleLabel } from './OutfitCard'
import { OutfitCollage } from './OutfitCollage'
import { Button, cx, Sheet, Spinner } from './ui'

/** Miniatura de un outfit guardado (grillas de Guardados y del calendario) */
export function OutfitTile({
  outfit,
  garments,
  onClick,
  active,
  sub,
}: {
  outfit: Outfit
  garments: Map<string, GarmentWithImage>
  onClick: () => void
  active?: boolean
  sub?: string
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx('overflow-hidden rounded-2xl bg-surface text-left ring-2 transition active:scale-[0.98]', active ? 'ring-ink' : 'ring-transparent')}
    >
      <OutfitCollage slots={slotsFromIds(outfit.itemIds, garments)} garments={garments} />
      <div className="px-3 py-2">
        <div className="truncate text-[13.5px] font-bold">{t(`outfits.occasions.${outfit.occasion}`)}</div>
        <div className="truncate text-[12.5px] text-muted">{sub ?? styleLabel(outfit.style, lang)}</div>
      </div>
    </button>
  )
}

/** Detalle de un outfit guardado: collage, días asignados, asignar a un día y borrar */
export function SavedOutfitSheet({
  outfit,
  garments,
  onClose,
}: {
  outfit: Outfit | null
  garments: Map<string, GarmentWithImage>
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const { days, remove, assignDay } = useOutfits()
  const [busy, setBusy] = useState(false)
  if (!outfit) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const incomplete = outfit.itemIds.some((id) => !garments.has(id))
  const onDays = Object.entries(days)
    .filter(([, id]) => id === outfit.id)
    .map(([d]) => d)
    .sort()

  async function del() {
    if (!outfit || !confirm(t('outfits.deleteConfirm'))) return
    setBusy(true)
    try {
      await remove(outfit.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function assign(date: string) {
    if (!outfit || !date) return
    setBusy(true)
    try {
      await assignDay(date, outfit.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span>
          {t(`outfits.occasions.${outfit.occasion}`)} <span className="font-normal text-muted">· {styleLabel(outfit.style, lang)}</span>
        </span>
      }
    >
      <div className="mx-auto max-w-sm overflow-hidden rounded-3xl">
        <OutfitCollage slots={slotsFromIds(outfit.itemIds, garments)} garments={garments} />
      </div>
      {onDays.length > 0 && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[14px] text-muted">
          <IconCalendar size={16} />
          {onDays.map((d) => fmtDate(d, lang, { weekday: 'short', day: 'numeric', month: 'short' })).join(' · ')}
        </p>
      )}
      {incomplete && <p className="mt-2 text-center text-[13px] text-danger">{t('outfits.incomplete')}</p>}
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="danger" onClick={del} disabled={busy} aria-label={t('common.delete')}>
          <IconTrash size={18} />
        </Button>
        {/* el input de fecha nativo va encima del botón: en el iPhone abre la ruedita */}
        <label className={cx('relative', busy && 'pointer-events-none opacity-40')}>
          <span className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-on-ink">
            {busy ? <Spinner className="h-4 w-4" /> : <IconCalendar size={18} />}
            {t('outfits.assignTo')}
          </span>
          <input
            type="date"
            aria-label={t('outfits.assignTo')}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => assign(e.target.value)}
          />
        </label>
      </div>
    </Sheet>
  )
}
