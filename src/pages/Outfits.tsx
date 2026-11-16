import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  IconBack,
  IconChevron,
  IconCloud,
  IconPin,
  IconRain,
  IconShuffle,
  IconSnow,
  IconStorm,
  IconSun,
  IconTrash,
} from '../components/Icons'
import { PageHeader } from '../components/Layout'
import { OutfitCard, styleLabel } from '../components/OutfitCard'
import { OutfitCollage } from '../components/OutfitCollage'
import { SwapSheet } from '../components/SwapSheet'
import { Button, Chip, cx, Sheet, Spinner } from '../components/ui'
import { useGarments } from '../lib/garments'
import { useOutfits } from '../lib/outfits/context'
import {
  generate,
  OCCASIONS,
  type Occasion,
  outfitIds,
  outfitKey,
  type OutfitSlots,
  seedFrom,
  type Slot,
  slotOf,
  styleOf,
  swapOptions,
} from '../lib/outfits/engine'
import type { GarmentWithImage, Outfit } from '../lib/store'
import type { Lang, StyleKey } from '../lib/taxonomy'
import { useDayWeather, type WeatherState } from '../lib/useDayWeather'
import { isoDate, weatherKind } from '../lib/weather'

interface Card {
  id: string
  slots: OutfitSlots
  style: StyleKey
  vote: 1 | -1 | null
}

const OCC_KEY = 'percha.occasion'
const DAY = 86400000

function readOccasion(): Occasion {
  try {
    const v = localStorage.getItem(OCC_KEY) as Occasion | null
    return v && OCCASIONS.includes(v) ? v : 'casual'
  } catch {
    return 'casual'
  }
}

/** Prendas usadas en outfits guardados con fecha cercana (±7 días): id → días de distancia */
function recentUse(saved: Outfit[], date: string) {
  const day = Date.parse(date)
  const out: Record<string, number> = {}
  for (const o of saved) {
    if (!o.date) continue
    const d = Math.abs(day - Date.parse(o.date)) / DAY
    if (d === 0 || d >= 7) continue
    for (const id of o.itemIds) out[id] = Math.min(out[id] ?? 99, d)
  }
  return out
}

/** Arma los lugares del collage a partir de una lista de prendas guardada */
function slotsFromIds(ids: string[], garments: Map<string, GarmentWithImage>): OutfitSlots {
  const slots: OutfitSlots = {}
  for (const id of ids) {
    const g = garments.get(id)
    const s = g && slotOf(g)
    if (s && !slots[s]) slots[s] = id
  }
  return slots
}

export default function Outfits() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const nav = useNavigate()
  const { items, loading } = useGarments()
  const { saved, prefs, loading: prefsLoading, save, remove, vote } = useOutfits()

  const [occasion, setOccasionState] = useState<Occasion>(readOccasion)
  const [date, setDate] = useState(isoDate)
  const [round, setRound] = useState(0)
  const [cards, setCards] = useState<Card[]>([])
  const [missing, setMissing] = useState<Slot[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [swap, setSwap] = useState<{ card: string; slot: Slot } | null>(null)
  const [openSaved, setOpenSaved] = useState<Outfit | null>(null)
  const [busySave, setBusySave] = useState<string | null>(null)

  const wx = useDayWeather(date, prefs.city, !prefsLoading)
  const weather = wx.status === 'ok' ? wx.w : null
  const garments = useMemo(() => new Map(items.map((g) => [g.id, g])), [items])
  const recent = useMemo(() => recentUse(saved, date), [saved, date])
  const savedByKey = useMemo(() => new Map(saved.map((o) => [[...o.itemIds].sort().join(','), o])), [saved])

  // Pesos y uso reciente se leen al generar, pero no regeneran: votar o guardar no tiene que
  // cambiar las tarjetas que estás mirando
  const ctxRef = useRef({ prefs: prefs.weights, recent })
  ctxRef.current = { prefs: prefs.weights, recent }

  function setOccasion(o: Occasion) {
    setOccasionState(o)
    try {
      localStorage.setItem(OCC_KEY, o)
    } catch {
      /* sin storage */
    }
  }

  const scroller = useRef<HTMLDivElement>(null)
  const wxReady = wx.status !== 'loading'
  useEffect(() => {
    if (loading || !wxReady) return
    const r = generate({
      garments: items,
      occasion,
      weather,
      recent: ctxRef.current.recent,
      prefs: ctxRef.current.prefs,
      seed: seedFrom(`${date}|${occasion}|${round}`),
      count: 6,
    })
    setCards(r.proposals.map((p) => ({ id: crypto.randomUUID(), slots: p.slots, style: p.style, vote: null })))
    setMissing(r.missing)
    setEditing(null)
    scroller.current?.scrollTo({ left: 0 })
    // el clima entra por sus valores, no por la identidad del objeto
  }, [items, loading, occasion, date, round, wxReady, weather?.tMax, weather?.tMin, weather?.rainProb])

  // ── Carrusel ──
  const [index, setIndex] = useState(0)
  function onScroll() {
    const el = scroller.current
    const first = el?.firstElementChild as HTMLElement | null
    if (!el || !first) return
    setIndex(Math.round(el.scrollLeft / (first.offsetWidth + 12)))
  }
  function go(delta: number) {
    const el = scroller.current
    const first = el?.firstElementChild as HTMLElement | null
    if (el && first) el.scrollBy({ left: delta * (first.offsetWidth + 12), behavior: 'smooth' })
  }

  // ── Acciones ──
  const patchCard = (id: string, p: Partial<Card>) => setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)))

  function onVote(c: Card, v: 1 | -1) {
    patchCard(c.id, { vote: v })
    vote(outfitIds(c.slots), v).catch((e) => console.warn('[outfits] voto', e))
  }

  async function onSave(c: Card) {
    const existing = savedByKey.get(outfitKey(c.slots))
    setBusySave(c.id)
    try {
      if (existing) await remove(existing.id)
      else await save({ occasion, style: c.style, itemIds: outfitIds(c.slots), date })
    } finally {
      setBusySave(null)
    }
  }

  function onPick(id: string | null) {
    if (!swap) return
    const c = cards.find((x) => x.id === swap.card)
    if (!c) return
    const slots = { ...c.slots }
    if (id) slots[swap.slot] = id
    else delete slots[swap.slot]
    const main = outfitIds(slots)
      .map((x) => garments.get(x)!)
      .filter((g) => g && slotOf(g) !== 'eyewear' && slotOf(g) !== 'accessory')
    // cambiar una prenda es otro outfit: se borra el voto
    patchCard(c.id, { slots, style: styleOf(main, occasion).style, vote: null })
    setSwap(null)
  }

  const swapCard = swap ? cards.find((c) => c.id === swap.card) : undefined
  const swapOpts = useMemo(
    () =>
      swap && swapCard
        ? swapOptions(items, swapCard.slots, swap.slot, { occasion, weather, recent, prefs: prefs.weights })
        : [],
    [swap, swapCard, items, occasion, weather, recent, prefs.weights],
  )

  const today = isoDate()
  const tomorrow = isoDate(new Date(Date.now() + DAY))

  return (
    <>
      <PageHeader title={t('outfits.title')} />

      {/* Ocasión, fecha y clima */}
      <div className="space-y-3 px-5 pt-3 md:px-10">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setOccasion(o)}>
              {t(`outfits.occasions.${o}`)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={date === today} onClick={() => setDate(today)}>
            {t('outfits.today')}
          </Chip>
          <Chip active={date === tomorrow} onClick={() => setDate(tomorrow)}>
            {t('outfits.tomorrow')}
          </Chip>
          <label
            className={cx(
              'relative inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium',
              date !== today && date !== tomorrow ? 'bg-ink text-on-ink' : 'bg-surface text-ink',
            )}
          >
            {date !== today && date !== tomorrow
              ? new Intl.DateTimeFormat(lang, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(date))
              : t('outfits.pickDate')}
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={t('outfits.pickDate')}
            />
          </label>
          <WeatherPill wx={wx} onSetCity={() => nav('/profile')} />
        </div>
      </div>

      {/* Propuestas */}
      <section className="mt-5">
        {loading || !wxReady ? (
          <div className="grid h-80 place-items-center text-muted">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <Empty text={t('outfits.emptyCloset')} cta={t('outfits.addGarments')} onCta={() => nav('/add')} />
        ) : missing.length ? (
          <Empty
            text={t('outfits.missing', {
              occasion: t(`outfits.occasions.${occasion}`).toLowerCase(),
              slots: missing.map((s) => t(`outfits.slots.${s}`).toLowerCase()).join(', '),
            })}
            cta={t('outfits.addGarments')}
            onCta={() => nav('/add')}
          />
        ) : cards.length === 0 ? (
          <Empty text={t('outfits.noProposals')} />
        ) : (
          <>
            <div className="relative">
              <div
                ref={scroller}
                onScroll={onScroll}
                className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto scroll-smooth px-5 pb-2 md:scroll-px-10 md:px-10"
              >
                {cards.map((c) => (
                  <div key={c.id} className="w-[86%] max-w-[380px] shrink-0 snap-center md:w-[360px] md:snap-start">
                    <OutfitCard
                      occasion={occasion}
                      style={c.style}
                      slots={c.slots}
                      garments={garments}
                      vote={c.vote}
                      saved={savedByKey.has(outfitKey(c.slots)) || busySave === c.id}
                      editing={editing === c.id}
                      onVote={(v) => onVote(c, v)}
                      onSave={() => onSave(c)}
                      onToggleEdit={() => setEditing(editing === c.id ? null : c.id)}
                      onSlot={(slot) => setSwap({ card: c.id, slot })}
                    />
                  </div>
                ))}
                {/* espacio al final para que la última tarjeta pueda quedar centrada */}
                <div className="w-1 shrink-0" />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-5 md:px-10">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => go(-1)}
                  className="hidden h-9 w-9 place-items-center rounded-full bg-surface disabled:opacity-30 md:grid"
                  disabled={index === 0}
                  aria-label="prev"
                >
                  <IconBack size={18} />
                </button>
                <span className="px-1 text-[13px] text-muted tabular-nums">
                  {t('outfits.of', { n: Math.min(index + 1, cards.length), total: cards.length })}
                </span>
                <button
                  onClick={() => go(1)}
                  className="hidden h-9 w-9 place-items-center rounded-full bg-surface disabled:opacity-30 md:grid"
                  disabled={index >= cards.length - 1}
                  aria-label="next"
                >
                  <IconChevron size={18} />
                </button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setRound((r) => r + 1)}>
                <IconShuffle size={17} />
                {t('outfits.shuffle')}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Guardados */}
      <section className="mt-10 px-5 md:px-10">
        <h2 className="text-[20px] font-bold tracking-[-0.02em]">{t('outfits.savedTitle')}</h2>
        {saved.length === 0 ? (
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">{t('outfits.savedEmpty')}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {saved.map((o) => (
              <button key={o.id} type="button" onClick={() => setOpenSaved(o)} className="overflow-hidden rounded-2xl bg-surface text-left">
                <OutfitCollage slots={slotsFromIds(o.itemIds, garments)} garments={garments} />
                <div className="px-3 py-2">
                  <div className="truncate text-[13.5px] font-bold">{t(`outfits.occasions.${o.occasion}`)}</div>
                  <div className="truncate text-[12.5px] text-muted">
                    {styleLabel(o.style, lang)}
                    {o.date &&
                      ` · ${new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(o.date))}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <SwapSheet
        slot={swap?.slot ?? null}
        current={swap && swapCard ? swapCard.slots[swap.slot] : undefined}
        options={swapOpts}
        garments={garments}
        onPick={onPick}
        onClose={() => setSwap(null)}
      />

      <SavedSheet outfit={openSaved} garments={garments} onClose={() => setOpenSaved(null)} onDelete={remove} />
    </>
  )
}

function WeatherPill({ wx, onSetCity }: { wx: WeatherState; onSetCity: () => void }) {
  const { t } = useTranslation()
  const base = 'inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-[13px]'
  if (wx.status === 'loading')
    return (
      <span className={cx(base, 'text-muted')}>
        <Spinner className="h-3.5 w-3.5" />
        {t('outfits.wxLoading')}
      </span>
    )
  if (wx.status === 'noLocation')
    return (
      <button type="button" onClick={onSetCity} className={cx(base, 'font-medium text-accent')}>
        <IconPin size={16} />
        {t('outfits.wxSetCity')}
      </button>
    )
  if (wx.status !== 'ok')
    return <span className={cx(base, 'text-muted')}>{t(wx.status === 'outOfRange' ? 'outfits.wxOutOfRange' : 'outfits.wxNone')}</span>

  const { w, place } = wx
  const Icon = { sun: IconSun, cloud: IconCloud, rain: IconRain, snow: IconSnow, storm: IconStorm }[weatherKind(w.code)]
  return (
    <span className={base}>
      <Icon size={17} />
      <span className="font-semibold tabular-nums">
        {Math.round(w.tMax)}° <span className="font-normal text-muted">/ {Math.round(w.tMin)}°</span>
      </span>
      {w.rainProb >= 20 && <span className="text-muted">· {t('outfits.wxRain', { p: Math.round(w.rainProb) })}</span>}
      {place && <span className="hidden text-muted sm:inline">· {place}</span>}
    </span>
  )
}

function Empty({ text, cta, onCta }: { text: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="mx-5 rounded-[28px] bg-surface px-6 py-12 text-center md:mx-10 md:max-w-xl">
      <p className="mx-auto max-w-sm text-[15px] leading-relaxed">{text}</p>
      {cta && (
        <Button className="mt-5" onClick={onCta}>
          {cta}
        </Button>
      )}
    </div>
  )
}

function SavedSheet({
  outfit,
  garments,
  onClose,
  onDelete,
}: {
  outfit: Outfit | null
  garments: Map<string, GarmentWithImage>
  onClose: () => void
  onDelete: (id: string) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const [busy, setBusy] = useState(false)
  if (!outfit) return <Sheet open={false} onClose={onClose}>{null}</Sheet>
  const incomplete = outfit.itemIds.some((id) => !garments.has(id))

  async function del() {
    if (!outfit || !confirm(t('outfits.deleteConfirm'))) return
    setBusy(true)
    try {
      await onDelete(outfit.id)
      onClose()
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
      {outfit.date && (
        <p className="mt-3 text-center text-[14px] text-muted">
          {new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(outfit.date))}
        </p>
      )}
      {incomplete && <p className="mt-2 text-center text-[13px] text-danger">{t('outfits.incomplete')}</p>}
      <div className="mt-5 flex justify-center">
        <Button variant="danger" onClick={del} disabled={busy}>
          <IconTrash size={18} />
          {t('common.delete')}
        </Button>
      </div>
    </Sheet>
  )
}
