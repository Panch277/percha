import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { GarmentInput } from '../lib/store'
import { autoDescription, CATEGORIES, COLORS, type Lang, STYLES, SUB_BY_KEY, SUBCATEGORIES } from '../lib/taxonomy'
import { Chip, Field, inputCls, Segmented } from './ui'

export function GarmentForm({
  value,
  onChange,
  brands,
  brandGuess,
}: {
  value: GarmentInput
  onChange: (v: GarmentInput) => void
  brands: string[]
  brandGuess?: string | null
}) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const listId = useId()
  const set = (patch: Partial<GarmentInput>) => onChange({ ...value, ...patch })

  const isAutoDesc = value.description === autoDescription(value.subcategory, value.colors[0], lang) || !value.description

  function setSub(key: string) {
    const d = SUB_BY_KEY[key]
    set({
      subcategory: key,
      category: d.category,
      warmth: d.warmth,
      formality: d.formality,
      ...(isAutoDesc ? { description: autoDescription(key, value.colors[0], lang) } : {}),
    })
  }

  function toggleColor(key: string) {
    const has = value.colors.includes(key)
    const colors = has ? value.colors.filter((c) => c !== key) : [...value.colors, key].slice(-3)
    set({ colors, ...(isAutoDesc ? { description: autoDescription(value.subcategory, colors[0], lang) } : {}) })
  }

  function toggleStyle(key: (typeof STYLES)[number]['key']) {
    const has = value.styles.includes(key)
    set({ styles: has ? value.styles.filter((s) => s !== key) : [...value.styles, key] })
  }

  const warmth = t('garment.warmthLevels', { returnObjects: true }) as string[]
  const formality = t('garment.formalityLevels', { returnObjects: true }) as string[]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t('garment.brand')}
          hint={
            brandGuess && value.brand === brandGuess ? (
              <span className="normal-case tracking-normal text-accent">✦ {t('add.brandSuggested')}</span>
            ) : undefined
          }
        >
          <input
            className={inputCls}
            list={listId}
            value={value.brand}
            placeholder={t('common.unknownBrand')}
            onChange={(e) => set({ brand: e.target.value })}
            autoCapitalize="words"
          />
          <datalist id={listId}>
            {brands.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
        <Field label={t('garment.description')}>
          <input className={inputCls} value={value.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
      </div>

      <Field label={t('garment.type')}>
        <div className="space-y-2">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                active={value.category === c.key}
                onClick={() => setSub(SUBCATEGORIES.find((s) => s.category === c.key)!.key)}
              >
                {c.label[lang]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUBCATEGORIES.filter((s) => s.category === value.category).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSub(s.key)}
                className={
                  'h-8 rounded-full border px-3 text-[13px] transition ' +
                  (value.subcategory === s.key ? 'border-ink font-semibold text-ink' : 'border-line text-muted')
                }
              >
                {s.label[lang]}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <Field label={t('garment.colors')}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const idx = value.colors.indexOf(c.key)
            return (
              <button
                key={c.key}
                type="button"
                title={c.label[lang]}
                onClick={() => toggleColor(c.key)}
                className="relative grid h-9 w-9 place-items-center rounded-full ring-1 ring-black/10 transition active:scale-90"
                style={{ background: c.hex }}
                aria-pressed={idx >= 0}
              >
                {idx >= 0 && (
                  <span className="absolute -inset-[4px] rounded-full ring-2 ring-ink">
                    {idx === 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-bg bg-accent" />}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label={t('garment.styles')}>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <Chip key={s.key} active={value.styles.includes(s.key)} onClick={() => toggleStyle(s.key)}>
              {s.label[lang]}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('garment.warmth')}>
          <Segmented
            value={value.warmth}
            onChange={(v) => set({ warmth: v })}
            options={[1, 2, 3].map((n) => ({ value: n as 1 | 2 | 3, label: warmth[n - 1] }))}
          />
        </Field>
        <Field label={t('garment.formality')}>
          <Segmented
            value={value.formality}
            onChange={(v) => set({ formality: v })}
            options={[1, 2, 3].map((n) => ({ value: n as 1 | 2 | 3, label: formality[n - 1] }))}
          />
        </Field>
      </div>
    </div>
  )
}
