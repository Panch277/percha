import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconBack, IconChevron, IconSparkle, IconTrash } from '../components/Icons'
import { PageHeader } from '../components/Layout'
import { styleLabel } from '../components/OutfitCard'
import { OutfitCollage } from '../components/OutfitCollage'
import { OutfitTile } from '../components/SavedOutfit'
import { OutfitVisual, TryOnButton } from '../components/TryOn'
import { Button, cx, Sheet, Spinner } from '../components/ui'
import { WeatherPill } from '../components/WeatherPill'
import { fmtDate, monthGrid, monthOf, shiftMonth, weekdayLabels, weekStartFor } from '../lib/calendar'
import { useGarments } from '../lib/garments'
import { useOutfits } from '../lib/outfits/context'
import { slotsFromIds } from '../lib/outfits/engine'
import type { GarmentWithImage, Outfit } from '../lib/store'
import type { Lang } from '../lib/taxonomy'
import { useDayWeather } from '../lib/useDayWeather'
import { isoDate } from '../lib/weather'

const YM = /^\d{4}-\d{2}$/
const WIDE = '(min-width: 1024px)'

/** En pantallas anchas el detalle del día va en un panel al costado; en el celular, en una hoja */
function useWide() {
  const [wide, setWide] = useState(() => matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

export default function Calendar() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const [params, setParams] = useSearchParams()
  const { items } = useGarments()
  const { saved, days, loading } = useOutfits()
  const wide = useWide()

  const today = isoDate()
  const mParam = params.get('m')
  const ym = mParam && YM.test(mParam) ? mParam : monthOf(today)
  const setMonth = (m: string) => setParams(m === monthOf(today) ? {} : { m }, { replace: true })

  // día elegido: en el celular abre la hoja; en escritorio se muestra en el panel (por defecto hoy)
  const [selected, setSelected] = useState<string | null>(null)
  const panelDay = selected ?? (monthOf(today) === ym ? today : `${ym}-01`)

  const weekStart = weekStartFor(lang)
  const grid = useMemo(() => monthGrid(ym, weekStart), [ym, weekStart])
  const garments = useMemo(() => new Map(items.map((g) => [g.id, g])), [items])
  const outfitsById = useMemo(() => new Map(saved.map((o) => [o.id, o])), [saved])
  const title = fmtDate(`${ym}-01`, lang, { month: 'long', year: 'numeric' })

  function onDay(date: string) {
    if (monthOf(date) !== ym) setMonth(monthOf(date))
    setSelected(date)
  }

  return (
    <>
      <PageHeader title={t('calendar.title')} />

      <div className="flex items-start gap-10 px-3 pt-3 md:px-10">
        <div className="mx-auto w-full max-w-5xl md:mx-0 lg:max-w-[640px]">
          {/* Navegación entre meses */}
          <div className="flex items-center justify-between px-2 md:px-0">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] first-letter:uppercase">{title}</h2>
            <div className="flex items-center gap-1">
              {ym !== monthOf(today) && (
                <Button variant="secondary" size="sm" className="mr-1" onClick={() => setMonth(monthOf(today))}>
                  {t('outfits.today')}
                </Button>
              )}
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(ym, -1))}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface"
                aria-label={t('calendar.prev')}
              >
                <IconBack size={18} />
              </button>
              <button
                type="button"
                onClick={() => setMonth(shiftMonth(ym, 1))}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface"
                aria-label={t('calendar.next')}
              >
                <IconChevron size={18} />
              </button>
            </div>
          </div>

          {/* Grilla */}
          <div className="mt-4 grid grid-cols-7 gap-x-1 gap-y-3 md:gap-x-2.5 md:gap-y-2">
            {weekdayLabels(lang, weekStart).map((w, i) => (
              <div key={i} className="text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
                {w}
              </div>
            ))}
            {grid.map((c) => {
              const outfit = outfitsById.get(days[c.date] ?? '')
              const isToday = c.date === today
              const isSel = wide && c.date === panelDay
              return (
                <button
                  key={c.date}
                  type="button"
                  onClick={() => onDay(c.date)}
                  className={cx(
                    'flex flex-col items-center gap-1 transition active:scale-95',
                    !c.inMonth && 'opacity-30',
                    c.inMonth && c.date < today && 'opacity-60',
                  )}
                  aria-label={fmtDate(c.date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
                  aria-pressed={isSel}
                >
                  <span
                    className={cx(
                      'grid h-6 min-w-6 place-items-center rounded-full px-1 text-[12.5px] tabular-nums md:text-[13.5px]',
                      isToday ? 'bg-ink font-bold text-on-ink' : 'font-medium',
                    )}
                  >
                    {c.day}
                  </span>
                  <span className={cx('block w-full rounded-lg ring-2 md:rounded-xl', isSel ? 'ring-ink' : 'ring-transparent')}>
                    {outfit ? (
                      <DayThumb outfit={outfit} garments={garments} />
                    ) : (
                      <span className="block aspect-[4/5] w-full rounded-lg bg-surface md:rounded-xl" />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          {loading && (
            <div className="mt-4 flex justify-center text-muted">
              <Spinner />
            </div>
          )}
        </div>

        {/* Escritorio: panel del día */}
        {wide && (
          <aside className="sticky top-6 w-[360px] shrink-0 rounded-[28px] bg-surface p-5">
            <h2 className="mb-4 text-[18px] font-bold tracking-[-0.02em] first-letter:uppercase">
              {fmtDate(panelDay, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <DayDetail key={panelDay} date={panelDay} garments={garments} />
          </aside>
        )}
      </div>

      {/* Celular: hoja del día */}
      {!wide && selected && (
        <Sheet
          open
          onClose={() => setSelected(null)}
          title={<span className="inline-block first-letter:uppercase">{fmtDate(selected, lang, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}
        >
          <DayDetail key={selected} date={selected} garments={garments} />
        </Sheet>
      )}
    </>
  )
}

/**
 * Miniatura del día: el render de la prueba virtual si existe (entrega 4), si no el collage
 * compacto (sin accesorios, para que se vea más grande).
 */
function DayThumb({ outfit, garments }: { outfit: Outfit; garments: Map<string, GarmentWithImage> }) {
  return (
    <span className="block w-full overflow-hidden rounded-lg md:rounded-xl">
      {outfit.tryonUrl ? (
        <span className="block aspect-[4/5] w-full bg-tile">
          <img src={outfit.tryonUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        </span>
      ) : (
        <OutfitCollage slots={slotsFromIds(outfit.itemIds, garments)} garments={garments} compact />
      )}
    </span>
  )
}

/** Contenido del día: clima, outfit asignado (cambiar / quitar) o cómo asignar uno */
function DayDetail({ date, garments }: { date: string; garments: Map<string, GarmentWithImage> }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const nav = useNavigate()
  const { saved, days, prefs, assignDay, clearDay, avatarUrl, jobs, tryOn, dismissJob } = useOutfits()
  const outfit = saved.find((o) => o.id === days[date])
  const [picking, setPicking] = useState(false)
  const [busy, setBusy] = useState(false)
  const wx = useDayWeather(date, prefs.city)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <WeatherPill wx={wx} onSetCity={() => nav('/profile')} className="mb-4 bg-bg" />

      {outfit && !picking ? (
        <>
          <div className="mx-auto max-w-xs overflow-hidden rounded-3xl">
            <OutfitVisual
              key={outfit.id}
              slots={slotsFromIds(outfit.itemIds, garments)}
              garments={garments}
              tryonUrl={outfit.tryonUrl}
              job={jobs[outfit.id]}
              onDismiss={() => dismissJob(outfit.id)}
            />
          </div>
          <p className="mt-3 text-center text-[15px]">
            <span className="font-semibold">{t(`outfits.occasions.${outfit.occasion}`)}</span>
            <span className="text-muted"> · {styleLabel(outfit.style, lang)}</span>
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="danger" disabled={busy} onClick={() => run(() => clearDay(date))} aria-label={t('calendar.remove')}>
              {busy ? <Spinner /> : <IconTrash size={18} />}
            </Button>
            <TryOnButton
              compact
              hasRender={!!outfit.tryonUrl}
              busy={!!jobs[outfit.id] && 'stage' in jobs[outfit.id]}
              onClick={() => (avatarUrl ? tryOn(outfit) : nav('/profile#avatar'))}
            />
            <Button variant="secondary" className="flex-1 bg-bg" onClick={() => setPicking(true)}>
              {t('calendar.change')}
            </Button>
          </div>
        </>
      ) : (
        <>
          {!outfit && <p className="mb-4 text-[15px] text-muted">{t('calendar.empty')}</p>}
          <Button className="w-full" onClick={() => nav(`/outfits?plan=${date}`)}>
            <IconSparkle size={18} />
            {t('calendar.generate')}
          </Button>
          <h3 className="mt-6 mb-3 text-[12px] font-semibold tracking-wide text-muted uppercase">{t('calendar.pickSaved')}</h3>
          {saved.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-muted">{t('calendar.noSaved')}</p>
          ) : (
            <div className={cx('grid grid-cols-3 gap-2', busy && 'pointer-events-none opacity-50')}>
              {saved.map((o) => (
                <OutfitTile
                  key={o.id}
                  outfit={o}
                  garments={garments}
                  active={o.id === outfit?.id}
                  onClick={() =>
                    run(async () => {
                      await assignDay(date, o.id)
                      setPicking(false)
                    })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
