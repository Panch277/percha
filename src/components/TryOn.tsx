import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TryOnJob } from '../lib/outfits/context'
import type { OutfitSlots, Slot } from '../lib/outfits/engine'
import type { GarmentWithImage } from '../lib/store'
import { getHfToken } from '../lib/tryon/token'
import type { TryOnStage } from '../lib/tryon/types'
import { IconAlert, IconShuffle, IconSparkle, IconX } from './Icons'
import { OutfitCollage } from './OutfitCollage'
import { cx, Spinner } from './ui'

function useStageText() {
  const { t } = useTranslation()
  return (s: TryOnStage) => {
    const eta = 'eta' in s && s.eta ? ` · ~${Math.max(1, Math.round(s.eta))} s` : ''
    if (s.kind === 'queue') return t('tryon.queue', { n: s.position ?? '…' }) + eta
    if (s.kind === 'running') return t(s.part === 'upper' ? 'tryon.upper' : 'tryon.lower') + eta
    return t(s.kind === 'saving' ? 'tryon.saving' : 'tryon.connecting')
  }
}

/**
 * Lo que se ve de un outfit: el collage o, si hay, el render de la prueba virtual (con un
 * selector para alternar). Mientras corre una prueba, muestra el progreso encima.
 */
export function OutfitVisual({
  slots,
  garments,
  tryonUrl,
  job,
  onSlot,
  onDismiss,
  className,
}: {
  slots: OutfitSlots
  garments: Map<string, GarmentWithImage>
  tryonUrl?: string | null
  job?: TryOnJob
  onSlot?: (s: Slot) => void
  onDismiss?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const stageText = useStageText()
  const [view, setView] = useState<'avatar' | 'collage'>('avatar')
  const showRender = !!tryonUrl && view === 'avatar' && !onSlot
  const hasToken = !!getHfToken()

  return (
    <div className={cx('relative', className)}>
      {showRender ? (
        <div className="aspect-[4/5] w-full overflow-hidden bg-tile">
          <img src={tryonUrl!} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <OutfitCollage slots={slots} garments={garments} onSlot={onSlot} />
      )}

      {tryonUrl && !onSlot && (
        <div className="absolute top-3 right-3 z-10 flex rounded-full bg-bg/85 p-0.5 text-[11.5px] font-semibold backdrop-blur">
          {(['avatar', 'collage'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cx('h-7 rounded-full px-2.5 transition', view === v ? 'bg-ink text-on-ink' : 'text-muted')}
            >
              {t(v === 'avatar' ? 'tryon.viewAvatar' : 'tryon.viewCollage')}
            </button>
          ))}
        </div>
      )}

      {job && 'stage' in job && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-bg/60 backdrop-blur-[3px]">
          <div className="flex max-w-[85%] items-center gap-2.5 rounded-full bg-ink px-4 py-2.5 text-[13px] font-medium text-on-ink">
            <Spinner className="h-4 w-4 shrink-0" />
            <span className="truncate">{stageText(job.stage)}</span>
          </div>
        </div>
      )}

      {job && 'error' in job && (
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-start gap-2 rounded-2xl bg-bg/95 p-3 text-[12.5px] leading-snug shadow-sm">
          <IconAlert size={16} className="mt-0.5 shrink-0 text-danger" />
          <span className="flex-1">
            {job.partial && <span className="font-semibold">{t('tryon.partial')} </span>}
            {t(`tryon.errors.${job.error}`)}
            {job.error === 'quota' && !hasToken && <span className="text-muted"> {t('tryon.tokenHint')}</span>}
          </span>
          {onDismiss && (
            <button type="button" onClick={onDismiss} aria-label={t('common.close')} className="-m-1 p-1 text-muted">
              <IconX size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Botón "Probármelo" / "Volver a probar" */
export function TryOnButton({
  hasRender,
  busy,
  onClick,
  compact,
}: {
  hasRender: boolean
  busy: boolean
  onClick: () => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cx(
        'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition active:scale-95 disabled:opacity-50',
        hasRender ? 'bg-bg text-ink' : 'bg-ink text-on-ink',
        !compact && 'ml-auto',
      )}
    >
      {busy ? <Spinner className="h-4 w-4" /> : hasRender ? <IconShuffle size={15} /> : <IconSparkle size={15} />}
      {t(hasRender ? 'tryon.retry' : 'tryon.button')}
    </button>
  )
}
