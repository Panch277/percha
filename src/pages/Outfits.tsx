import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconBack, IconCalendar, IconChevron, IconShuffle, IconX } from '../components/Icons'
import { PageHeader } from '../components/Layout'
import { OutfitCard } from '../components/OutfitCard'
import { OutfitTile, SavedOutfitSheet } from '../components/SavedOutfit'
import { SwapSheet } from '../components/SwapSheet'
import { Button, Chip, cx, Spinner } from '../components/ui'
import { WeatherPill } from '../components/WeatherPill'
import { fmtDate, monthOf, recentUse } from '../lib/calendar'
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
import type { Outfit } from '../lib/store'
import type { Lang, StyleKey } from '../lib/taxonomy'
import { useDayWeather } from '../lib/useDayWeather'
import { isoDate } from '../lib/weather'

interface Card {
  id: string
  slots: OutfitSlots
  style: StyleKey
  vote: 1 | -1 | null
}

const OCC_KEY = 'percha.occasion'
const DAY = 86400000
const ISO = /^\d{4}-\d{2}-\d{2}$/

function readOccasion(): Occasion {
  try {
    const v = localStorage.getItem(OCC_KEY) as Occasion | null
    return v && OCCASIONS.includes(v) ? v : 'casual'
  } catch {
    return 'casual'
  }
}

export default function Outfits() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const nav = useNavigate()
  const [params] = useSearchParams()
  // modo planificar: se llega desde el calendario con ?plan=YYYY-MM-DD
  const planParam = params.get('plan')
  const plan = planParam && ISO.test(planParam) ? planParam : null

  const { items, loading } = useGarments()
  const { saved, prefs, days, loading: prefsLoading, save, remove, vote, assignDay, avatarUrl, jobs, tryOn, dismissJob } = useOutfits()

  const [occasion, setOccasionState] = useState<Occasion>(readOccasion)
  const [pickedDate, setDate] = useState(isoDate)
  const date = plan ?? pickedDate
  const [round, setRound] = useState(0)
  const [cards, setCards] = useState<Card[]>([])
  const [missing, setMissing] = useState<Slot[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [swap, setSwap] = useState<{ card: string; slot: Slot } | null>(null)
  const [openSaved, setOpenSaved] = useState<Outfit | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const wx = useDayWeather(date, prefs.city, !prefsLoading)
  const weather = wx.status === 'ok' ? wx.w : null
  const garments = useMemo(() => new Map(items.map((g) => [g.id, g])), [items])
  const itemsByOutfit = useMemo(() => new Map(saved.map((o) => [o.id, o.itemIds])), [saved])
  // uso reciente: lo planificado en el calendario a ±7 días de la fecha elegida
  const recent = useMemo(() => recentUse(days, itemsByOutfit, date), [days, itemsByOutfit, date])
  const savedByKey = useMemo(() => new Map(saved.map((o) => [[...o.itemIds].sort().join(','), o])), [saved])

  // Pesos y uso reciente se leen al generar, pero no regeneran: votar, guardar o asignar no
  // tiene que cambiar las tarjetas que estás mirando
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
    if (loading || prefsLoading || !wxReady) return
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
  }, [items, loading, prefsLoading, occasion, date, round, wxReady, weather?.tMax, weather?.tMin, weather?.rainProb])

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
    setBusy(c.id)
    try {
      if (existing) await remove(existing.id)
      else await save({ occasion, style: c.style, itemIds: outfitIds(c.slots), date })
    } finally {
      setBusy(null)
    }
  }

  /** Modo planificar: guarda el outfit (si no estaba) y lo asigna al día del calendario */
  async function onAssign(c: Card) {
    if (!plan) return
    setBusy(c.id)
    try {
      const o = savedByKey.get(outfitKey(c.slots)) ?? (await save({ occasion, style: c.style, itemIds: outfitIds(c.slots), date: plan }))
      await assignDay(plan, o.id)
      nav(`/calendar?m=${monthOf(plan)}`)
    } finally {
      setBusy(null)
    }
  }

  /** Probármelo: sin avatar lleva a Perfil; si el outfit no está guardado, lo guarda primero */
  async function onTryOn(c: Card) {
    if (!avatarUrl) {
      nav('/profile#avatar')
      return
    }
    const o = savedByKey.get(outfitKey(c.slots)) ?? (await save({ occasion, style: c.style, itemIds: outfitIds(c.slots), date }))
    await tryOn(o)
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

  // fechas del día para los chips (se recalculan en cada render: alcanza)
  const today = isoDate()
  const tomorrow = isoDate(new Date(new Date().getTime() + DAY))
  const otherDate = date !== today && date !== tomorrow
  const dayName = (d: string) => fmtDate(d, lang, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <PageHeader title={t('outfits.title')} />

      {/* Ocasión, fecha y clima */}
      <div className="space-y-3 px-5 pt-3 md:px-10">
        {plan && (
          <div className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-on-ink">
            <IconCalendar size={20} className="shrink-0" />
            <p className="min-w-0 flex-1 text-[14px] leading-snug">
              {t('outfits.planning')} <span className="font-semibold">{dayName(plan)}</span>
            </p>
            <button
              type="button"
              onClick={() => nav(`/calendar?m=${monthOf(plan)}`)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-on-ink/15"
              aria-label={t('common.cancel')}
            >
              <IconX size={18} />
            </button>
          </div>
        )}
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {OCCASIONS.map((o) => (
            <Chip key={o} active={occasion === o} onClick={() => setOccasion(o)}>
              {t(`outfits.occasions.${o}`)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!plan && (
            <>
              <Chip active={date === today} onClick={() => setDate(today)}>
                {t('outfits.today')}
              </Chip>
              <Chip active={date === tomorrow} onClick={() => setDate(tomorrow)}>
                {t('outfits.tomorrow')}
              </Chip>
              <label
                className={cx(
                  'relative inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium',
                  otherDate ? 'bg-ink text-on-ink' : 'bg-surface text-ink',
                )}
              >
                {otherDate ? fmtDate(date, lang, { weekday: 'short', day: 'numeric', month: 'short' }) : t('outfits.pickDate')}
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label={t('outfits.pickDate')}
                />
              </label>
            </>
          )}
          <WeatherPill wx={wx} onSetCity={() => nav('/profile')} />
        </div>
      </div>

      {/* Propuestas */}
      <section className="mt-5">
        {loading || prefsLoading || !wxReady ? (
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
                    saved={savedByKey.has(outfitKey(c.slots)) || busy === c.id}
                    editing={editing === c.id}
                    onVote={(v) => onVote(c, v)}
                    onSave={() => onSave(c)}
                    onToggleEdit={() => setEditing(editing === c.id ? null : c.id)}
                    onSlot={(slot) => setSwap({ card: c.id, slot })}
                    onAssign={plan ? () => onAssign(c) : undefined}
                    assigning={busy === c.id}
                    tryonUrl={savedByKey.get(outfitKey(c.slots))?.tryonUrl}
                    job={jobs[savedByKey.get(outfitKey(c.slots))?.id ?? '']}
                    onTryOn={() => onTryOn(c)}
                    onDismissJob={() => dismissJob(savedByKey.get(outfitKey(c.slots))?.id ?? '')}
                  />
                </div>
              ))}
              {/* espacio al final para que la última tarjeta pueda quedar centrada */}
              <div className="w-1 shrink-0" />
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

      {/* Guardados (en modo planificar no hacen falta) */}
      {!plan && (
        <section className="mt-10 px-5 md:px-10">
          <h2 className="text-[20px] font-bold tracking-[-0.02em]">{t('outfits.savedTitle')}</h2>
          {saved.length === 0 ? (
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted">{t('outfits.savedEmpty')}</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {saved.map((o) => (
                <OutfitTile key={o.id} outfit={o} garments={garments} onClick={() => setOpenSaved(o)} />
              ))}
            </div>
          )}
        </section>
      )}

      <SwapSheet
        slot={swap?.slot ?? null}
        current={swap && swapCard ? swapCard.slots[swap.slot] : undefined}
        options={swapOpts}
        garments={garments}
        onPick={onPick}
        onClose={() => setSwap(null)}
      />

      <SavedOutfitSheet outfit={openSaved} garments={garments} onClose={() => setOpenSaved(null)} />
    </>
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
