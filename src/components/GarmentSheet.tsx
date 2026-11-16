import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGarments } from '../lib/garments'
import type { GarmentInput } from '../lib/store'
import { COLOR_BY_KEY, type Lang, STYLES, SUB_BY_KEY } from '../lib/taxonomy'
import { GarmentForm } from './GarmentForm'
import { IconTrash } from './Icons'
import { Button, Sheet, Spinner } from './ui'

export function GarmentSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const { items, update, remove, brands } = useGarments()
  const g = items.find((x) => x.id === id) ?? null
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<GarmentInput | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setEditing(false)
    setDraft(null)
  }, [id])

  if (!g) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const { id: _id, createdAt: _c, imageUrl: _i, thumbUrl: _t, ...input } = g
  const warmth = t('garment.warmthLevels', { returnObjects: true }) as string[]
  const formality = t('garment.formalityLevels', { returnObjects: true }) as string[]

  async function save() {
    if (!draft || !g) return
    setBusy(true)
    try {
      await update(g.id, draft)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    if (!g || !confirm(t('garment.deleteConfirm'))) return
    setBusy(true)
    try {
      await remove(g.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={!!g} onClose={onClose} title={editing ? t('common.edit') : undefined}>
      <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-tile">
        <img src={g.imageUrl || g.thumbUrl} alt={g.description} className="h-full w-full object-contain p-[8%]" />
      </div>

      {editing && draft ? (
        <div className="mt-6">
          <GarmentForm value={draft} onChange={setDraft} brands={brands} />
          <div className="mt-8 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={save} disabled={busy}>
              {busy ? <Spinner /> : t('common.save')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <div className="text-[22px] font-bold tracking-tight">{g.brand || t('common.unknownBrand')}</div>
            <div className="text-[15px] text-muted">{g.description}</div>
          </div>
          <dl className="mt-5 divide-y divide-line rounded-2xl bg-surface px-4 text-[14px]">
            <Row k={t('garment.type')} v={SUB_BY_KEY[g.subcategory]?.label[lang] ?? g.subcategory} />
            <Row
              k={t('garment.colors')}
              v={
                <span className="flex items-center justify-end gap-1.5">
                  {g.colors.map((c) => (
                    <span key={c} title={COLOR_BY_KEY[c]?.label[lang]} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: COLOR_BY_KEY[c]?.hex }} />
                  ))}
                  {g.colors[0] && <span className="ml-1">{COLOR_BY_KEY[g.colors[0]]?.label[lang]}</span>}
                </span>
              }
            />
            <Row k={t('garment.styles')} v={g.styles.map((s) => STYLES.find((x) => x.key === s)?.label[lang]).join(' · ') || '—'} />
            <Row k={t('garment.pattern')} v={t(g.pattern ? 'garment.patternYes' : 'garment.patternNo')} />
            <Row k={t('garment.warmth')} v={warmth[g.warmth - 1]} />
            <Row k={t('garment.formality')} v={formality[g.formality - 1]} />
          </dl>
          <div className="mt-6 flex gap-2">
            <Button variant="danger" onClick={del} disabled={busy} aria-label={t('common.delete')}>
              <IconTrash size={18} />
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setDraft(input)
                setEditing(true)
              }}
            >
              {t('common.edit')}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  )
}
