import { useTranslation } from 'react-i18next'
import type { Occasion, OutfitSlots, Slot } from '../lib/outfits/engine'
import type { GarmentWithImage } from '../lib/store'
import { type Lang, STYLES, type StyleKey } from '../lib/taxonomy'
import { IconBookmark, IconCalendar, IconPencil, IconSparkle, IconThumbDown, IconThumbUp } from './Icons'
import { OutfitCollage } from './OutfitCollage'
import { cx, Spinner } from './ui'

export const EDIT_SLOTS: Slot[] = ['top', 'bottom', 'footwear', 'outerwear', 'headwear', 'eyewear', 'accessory']

export function styleLabel(s: StyleKey, lang: Lang) {
  return STYLES.find((x) => x.key === s)?.label[lang] ?? s
}

export function OutfitCard({
  occasion,
  style,
  slots,
  garments,
  vote,
  saved,
  editing,
  onVote,
  onSave,
  onToggleEdit,
  onSlot,
  onAssign,
  assigning,
}: {
  occasion: Occasion
  style: StyleKey
  slots: OutfitSlots
  garments: Map<string, GarmentWithImage>
  vote: 1 | -1 | null
  saved: boolean
  editing: boolean
  onVote: (v: 1 | -1) => void
  onSave: () => void
  onToggleEdit: () => void
  onSlot: (s: Slot) => void
  /** modo planificar (desde el calendario): reemplaza guardar y probármelo por "Asignar al día" */
  onAssign?: () => void
  assigning?: boolean
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang

  return (
    <article className={cx('flex flex-col overflow-hidden rounded-[28px] bg-surface transition', vote === -1 && 'opacity-55')}>
      <header className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-3">
        <h3 className="truncate text-[19px] font-bold tracking-[-0.02em]">{t(`outfits.occasions.${occasion}`)}</h3>
        <span className="shrink-0 text-[15px] text-muted">{styleLabel(style, lang)}</span>
      </header>

      <OutfitCollage slots={slots} garments={garments} onSlot={editing ? onSlot : undefined} />

      {editing ? (
        <div className="px-4 pt-3 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {EDIT_SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSlot(s)}
                className={cx(
                  'h-8 rounded-full border px-3 text-[12.5px] font-medium transition active:scale-95',
                  slots[s] ? 'border-ink text-ink' : 'border-dashed border-line text-muted',
                )}
              >
                {t(`outfits.slots.${s}`)}
              </button>
            ))}
          </div>
          <button type="button" onClick={onToggleEdit} className="mt-3 h-10 w-full rounded-full bg-ink text-[14px] font-semibold text-on-ink">
            {t('outfits.doneEditing')}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-3 py-3">
          <IconBtn label={t('outfits.like')} active={vote === 1} onClick={() => onVote(1)} disabled={vote !== null}>
            <IconThumbUp size={22} fill={vote === 1 ? 'currentColor' : 'none'} />
          </IconBtn>
          <IconBtn label={t('outfits.edit')} onClick={onToggleEdit}>
            <IconPencil size={21} />
          </IconBtn>
          <IconBtn label={t('outfits.dislike')} active={vote === -1} onClick={() => onVote(-1)} disabled={vote !== null}>
            <IconThumbDown size={22} fill={vote === -1 ? 'currentColor' : 'none'} />
          </IconBtn>
          {onAssign ? (
            <button
              type="button"
              onClick={onAssign}
              disabled={assigning}
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold whitespace-nowrap text-on-ink transition active:scale-95 disabled:opacity-50"
            >
              {assigning ? <Spinner className="h-4 w-4" /> : <IconCalendar size={17} />}
              {t('outfits.assignDay')}
            </button>
          ) : (
            <>
              <IconBtn label={saved ? t('outfits.saved') : t('outfits.save')} active={saved} onClick={onSave}>
                <IconBookmark size={21} fill={saved ? 'currentColor' : 'none'} />
              </IconBtn>
              <TryOnSoon />
            </>
          )}
        </div>
      )}
    </article>
  )
}

/** Prueba virtual: llega en la entrega 4 */
function TryOnSoon() {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      disabled
      className="ml-auto flex h-10 flex-col items-center justify-center rounded-full bg-ink px-4 text-on-ink opacity-45"
      title={t('common.soon')}
    >
      <span className="flex items-center gap-1.5 text-[13px] leading-none font-semibold">
        <IconSparkle size={15} />
        {t('outfits.tryOn')}
      </span>
      <span className="mt-0.5 text-[9.5px] leading-none font-medium tracking-wide uppercase">{t('common.soon')}</span>
    </button>
  )
}

function IconBtn({
  label,
  active,
  children,
  ...rest
}: { label: string; active?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        'grid h-10 w-10 place-items-center rounded-full transition active:scale-90 disabled:cursor-default',
        active ? 'text-accent' : 'text-ink hover:bg-bg disabled:opacity-30 disabled:hover:bg-transparent',
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
