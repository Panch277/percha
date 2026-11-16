import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { GarmentCard } from '../components/GarmentCard'
import { GarmentSheet } from '../components/GarmentSheet'
import { IconPlus, IconSearch, IconSliders, IconX } from '../components/Icons'
import { PageHeader } from '../components/Layout'
import { Button, Chip, cx, Sheet, Spinner } from '../components/ui'
import { useGarments } from '../lib/garments'
import { CATEGORIES, COLOR_BY_KEY, COLORS, type CategoryKey, type Lang, SUB_BY_KEY } from '../lib/taxonomy'

function norm(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

export default function Closet() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const nav = useNavigate()
  const { items, loading, error, refresh, brands } = useGarments()

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<CategoryKey | null>(null)
  const [colors, setColors] = useState<string[]>([])
  const [brand, setBrand] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const presentColors = useMemo(() => COLORS.filter((c) => items.some((g) => g.colors.includes(c.key))), [items])

  const filtered = useMemo(() => {
    const nq = norm(q.trim())
    return items.filter((g) => {
      if (cat && g.category !== cat) return false
      if (brand && g.brand.trim() !== brand) return false
      if (colors.length && !colors.some((c) => g.colors.includes(c))) return false
      if (!nq) return true
      const sub = SUB_BY_KEY[g.subcategory]
      const hay = norm(
        [g.brand, g.description, sub?.label.es, sub?.label.en, ...g.colors.flatMap((c) => [COLOR_BY_KEY[c]?.label.es, COLOR_BY_KEY[c]?.label.en])].join(' '),
      )
      return nq.split(/\s+/).every((w) => hay.includes(w))
    })
  }, [items, q, cat, brand, colors])

  const extraFilters = colors.length + (brand ? 1 : 0)
  const clear = () => {
    setQ('')
    setCat(null)
    setColors([])
    setBrand(null)
  }

  const addBtn = (
    <div className="hidden md:block">
      <Button onClick={() => nav('/add')}>
        <IconPlus size={18} />
        {t('closet.add')}
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader title={t('closet.title')} sub={!loading && t('closet.count', { count: items.length })} right={addBtn} />

      {items.length > 0 && (
        <div className="sticky top-0 z-30 bg-bg/90 px-5 pt-3 pb-3 backdrop-blur-xl md:px-10">
          <div className="flex gap-2">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-full bg-surface px-4">
              <IconSearch size={18} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('closet.search')}
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
              {q && (
                <button onClick={() => setQ('')} aria-label="clear">
                  <IconX size={16} className="text-muted" />
                </button>
              )}
            </label>
            <button
              onClick={() => setFiltersOpen(true)}
              className={cx('relative grid h-11 w-11 place-items-center rounded-full', extraFilters ? 'bg-ink text-on-ink' : 'bg-surface')}
              aria-label={t('closet.filters')}
            >
              <IconSliders size={20} />
              {extraFilters > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                  {extraFilters}
                </span>
              )}
            </button>
          </div>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 md:-mx-10 md:px-10">
            <Chip active={!cat} onClick={() => setCat(null)}>
              {t('common.all')}
            </Chip>
            {CATEGORIES.filter((c) => items.some((g) => g.category === c.key)).map((c) => (
              <Chip key={c.key} active={cat === c.key} onClick={() => setCat(cat === c.key ? null : c.key)}>
                {c.label[lang]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <section className="px-3 md:px-10">
        {loading ? (
          <div className="grid h-60 place-items-center text-muted">
            <Spinner />
          </div>
        ) : error ? (
          <div className="mx-2 mt-6 rounded-3xl bg-surface p-6 text-center">
            <p className="text-[14px] text-muted">{error}</p>
            <Button variant="secondary" className="mt-4 bg-bg" onClick={refresh}>
              {t('common.retry')}
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyCloset onAdd={() => nav('/add')} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted">{t('closet.noResults')}</p>
            <Button variant="secondary" className="mt-4" onClick={clear}>
              {t('closet.clearFilters')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-2 gap-y-2 pt-1 sm:grid-cols-4 md:gap-x-4 md:gap-y-5 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((g) => (
              <GarmentCard key={g.id} g={g} onClick={() => setOpenId(g.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Botón flotante en móvil */}
      {items.length > 0 && (
        <button
          onClick={() => nav('/add')}
          className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-13 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-on-ink shadow-[0_8px_30px_rgba(0,0,0,0.25)] active:scale-95 md:hidden"
        >
          <IconPlus size={20} strokeWidth={2.2} />
          {t('closet.add')}
        </button>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={t('closet.filters')}>
        <div className="space-y-6">
          {presentColors.length > 0 && (
            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{t('closet.color')}</div>
              <div className="flex flex-wrap gap-2">
                {presentColors.map((c) => (
                  <Chip
                    key={c.key}
                    swatch={c.hex}
                    active={colors.includes(c.key)}
                    onClick={() => setColors((p) => (p.includes(c.key) ? p.filter((x) => x !== c.key) : [...p, c.key]))}
                  >
                    {c.label[lang]}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {brands.length > 0 && (
            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{t('closet.brand')}</div>
              <div className="flex flex-wrap gap-2">
                <Chip active={!brand} onClick={() => setBrand(null)}>
                  {t('closet.allBrands')}
                </Chip>
                {brands.map((b) => (
                  <Chip key={b} active={brand === b} onClick={() => setBrand(brand === b ? null : b)}>
                    {b}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => (setColors([]), setBrand(null))}>
              {t('closet.clearFilters')}
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              {t('closet.count', { count: filtered.length })}
            </Button>
          </div>
        </div>
      </Sheet>

      <GarmentSheet id={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

function EmptyCloset({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="mx-2 mt-6 overflow-hidden rounded-[28px] bg-surface md:mx-0">
      <div className="grid grid-cols-3 gap-2 p-5 opacity-60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-bg" />
        ))}
      </div>
      <div className="px-6 pb-8 text-center">
        <h2 className="text-[20px] font-bold tracking-tight">{t('closet.emptyTitle')}</h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted">{t('closet.emptyBody')}</p>
        <Button size="lg" className="mt-6" onClick={onAdd}>
          <IconPlus size={20} />
          {t('closet.emptyCta')}
        </Button>
      </div>
    </div>
  )
}
