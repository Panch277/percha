import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { GarmentForm } from '../components/GarmentForm'
import { IconAlert, IconBack, IconCheck, IconImage, IconX } from '../components/Icons'
import { Button, cx, ProgressBar, Segmented, Spinner } from '../components/ui'
import { ai, type ModelProgress } from '../lib/ai/client'
import { processPhoto, type ProcessedPhoto } from '../lib/ai/process'
import { useGarments } from '../lib/garments'
import type { GarmentInput } from '../lib/store'
import type { Lang } from '../lib/taxonomy'

type Status = 'pending' | 'processing' | 'ready' | 'saving' | 'saved' | 'discarded' | 'error'
interface Item {
  key: string
  file: File
  localUrl: string
  status: Status
  result?: ProcessedPhoto
  data?: GarmentInput
  useCutout: boolean
  error?: string
}

export default function AddGarments() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language.startsWith('en') ? 'en' : 'es') as Lang
  const nav = useNavigate()
  const { add, brands } = useGarments()
  const inputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<Item[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [model, setModel] = useState<ModelProgress>({ seg: null, clip: null })
  const [savedCount, setSavedCount] = useState(0)
  const working = useRef(false)

  useEffect(() => ai.onProgress(setModel), [])

  // Libera las URLs temporales al salir
  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(
    () => () =>
      itemsRef.current.forEach((it) => {
        URL.revokeObjectURL(it.localUrl)
        if (it.result) {
          URL.revokeObjectURL(it.result.original.previewUrl)
          if (it.result.cutout) URL.revokeObjectURL(it.result.cutout.previewUrl)
        }
      }),
    [],
  )

  const patch = useCallback((key: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...p } : it)))
  }, [])

  // Cola: procesa de a una foto por vez
  useEffect(() => {
    if (working.current) return
    const next = items.find((it) => it.status === 'pending')
    if (!next) return
    working.current = true
    patch(next.key, { status: 'processing' })
    processPhoto(next.file, lang)
      .then((result) => {
        patch(next.key, { status: 'ready', result, data: result.suggestion, useCutout: !!result.cutout })
        setCurrent((c) => c ?? next.key)
      })
      .catch((e) => patch(next.key, { status: 'error', error: e instanceof Error ? e.message : String(e) }))
      .finally(() => {
        working.current = false
        setItems((p) => [...p]) // dispara el siguiente
      })
  }, [items, lang, patch])

  function onPick(files: FileList | null) {
    if (!files?.length) return
    const added: Item[] = [...files]
      .filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
      .map((file) => ({ key: crypto.randomUUID(), file, localUrl: URL.createObjectURL(file), status: 'pending', useCutout: true }))
    setItems((p) => [...p, ...added])
  }

  const active = items.filter((it) => it.status !== 'discarded' && it.status !== 'saved')
  const ready = items.filter((it) => it.status === 'ready')
  const processingIdx = items.findIndex((it) => it.status === 'processing')
  const cur = items.find((it) => it.key === current && (it.status === 'ready' || it.status === 'saving'))
  const allDone = items.length > 0 && active.length === 0

  function goNext(fromKey: string) {
    const order = items.filter((it) => it.key !== fromKey && (it.status === 'ready' || it.status === 'processing' || it.status === 'pending'))
    const nextReady = order.find((it) => it.status === 'ready')
    setCurrent(nextReady?.key ?? null)
  }

  async function saveOne(it: Item) {
    if (!it.result || !it.data) return
    const v = it.useCutout && it.result.cutout ? it.result.cutout : it.result.original
    patch(it.key, { status: 'saving' })
    try {
      await add({ data: it.data, image: v.image, thumb: v.thumb })
      patch(it.key, { status: 'saved' })
      setSavedCount((n) => n + 1)
      return true
    } catch (e) {
      patch(it.key, { status: 'ready', error: e instanceof Error ? e.message : String(e) })
      return false
    }
  }

  async function saveCurrent() {
    if (!cur) return
    if (await saveOne(cur)) goNext(cur.key)
  }

  async function saveAll() {
    for (const it of ready) await saveOne(it)
    setCurrent(null)
  }

  function discard(key: string) {
    patch(key, { status: 'discarded' })
    goNext(key)
  }

  // Cuando se libera un ítem listo y no hay ninguno seleccionado, mostrarlo
  useEffect(() => {
    if (!cur) {
      const r = items.find((it) => it.status === 'ready')
      if (r && r.key !== current) setCurrent(r.key)
    }
  }, [items, cur, current])

  const downloading = processingIdx >= 0 && ((model.seg !== null && model.seg < 1) || (model.clip !== null && model.clip < 1))

  return (
    <div className="mx-auto max-w-3xl">
      <header className="pt-safe sticky top-0 z-30 bg-bg/90 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-3">
          <button onClick={() => nav('/')} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="back">
            <IconBack />
          </button>
          <h1 className="flex-1 text-[17px] font-semibold">{t('add.title')}</h1>
          {ready.length > 1 && (
            <Button size="sm" onClick={saveAll}>
              {t('add.saveAll', { n: ready.length })}
            </Button>
          )}
        </div>
        {items.length > 0 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            {items
              .filter((it) => it.status !== 'discarded')
              .map((it) => (
                <button
                  key={it.key}
                  onClick={() => it.status === 'ready' && setCurrent(it.key)}
                  className={cx(
                    'relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-tile ring-2 transition',
                    it.key === cur?.key ? 'ring-ink' : 'ring-transparent',
                  )}
                >
                  <img
                    src={it.result ? (it.useCutout && it.result.cutout ? it.result.cutout.previewUrl : it.result.original.previewUrl) : it.localUrl}
                    className={cx('h-full w-full', it.result ? 'object-contain p-1' : 'object-cover opacity-50')}
                    alt=""
                  />
                  {(it.status === 'processing' || it.status === 'saving') && (
                    <span className="absolute inset-0 grid place-items-center bg-white/40">
                      <Spinner className="h-4 w-4 text-ink" />
                    </span>
                  )}
                  {it.status === 'saved' && (
                    <span className="absolute inset-0 grid place-items-center bg-ink/60 text-white">
                      <IconCheck size={20} />
                    </span>
                  )}
                  {it.status === 'error' && (
                    <span className="absolute inset-0 grid place-items-center bg-white/60 text-danger">
                      <IconAlert size={18} />
                    </span>
                  )}
                </button>
              ))}
            <button
              onClick={() => inputRef.current?.click()}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-line text-muted"
              aria-label={t('add.pick')}
            >
              +
            </button>
          </div>
        )}
      </header>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="px-5 pb-40">
        {items.length === 0 && (
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-6 flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[28px] bg-surface px-8 text-center transition active:scale-[0.99] md:aspect-[16/9]"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-on-ink">
              <IconImage size={28} />
            </span>
            <span className="mt-5 text-[19px] font-bold tracking-tight">{t('add.pick')}</span>
            <span className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">{t('add.pickHint')}</span>
          </button>
        )}

        {processingIdx >= 0 && !cur && (
          <div className="mt-6 rounded-[28px] bg-surface p-6">
            <div className="flex items-center gap-3">
              <Spinner />
              <div className="font-semibold">
                {t('add.processing', { n: items.filter((i) => i.status !== 'pending').length, total: items.length })}
              </div>
            </div>
            {downloading && <ModelBars model={model} />}
          </div>
        )}

        {cur?.result && cur.data && (
          <div key={cur.key} className="animate-fade mt-4">
            <div className="checker relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[28px]">
              <img
                src={cur.useCutout && cur.result.cutout ? cur.result.cutout.previewUrl : cur.result.original.previewUrl}
                className="h-full w-full object-contain p-[8%]"
                alt=""
              />
              <span className="absolute top-3 left-3 rounded-full bg-bg/80 px-3 py-1 text-[12px] font-medium backdrop-blur">
                {t('add.reviewOf', { n: ready.findIndex((r) => r.key === cur.key) + 1 + savedCount, total: savedCount + active.length })}
              </span>
            </div>

            {cur.result.cutout && (
              <div className="mx-auto mt-3 max-w-xs">
                <Segmented
                  value={cur.useCutout ? 'cut' : 'orig'}
                  onChange={(v) => patch(cur.key, { useCutout: v === 'cut' })}
                  options={[
                    { value: 'cut', label: t('add.useCutout') },
                    { value: 'orig', label: t('add.useOriginal') },
                  ]}
                />
              </div>
            )}

            {cur.result.warnings.map((w) => (
              <p key={w} className="mt-3 flex items-start gap-2 rounded-2xl bg-surface p-3 text-[13px] text-muted">
                <IconAlert size={16} className="mt-0.5 shrink-0" />
                {t(w === 'bg_failed' ? 'add.bgFailed' : 'add.tagFailed')}
              </p>
            ))}
            {cur.error && <p className="mt-3 rounded-2xl bg-surface p-3 text-[13px] text-danger">{cur.error}</p>}

            <div className="mt-6">
              <GarmentForm value={cur.data} onChange={(d) => patch(cur.key, { data: d })} brands={brands} brandGuess={cur.result.brandGuess} />
            </div>
          </div>
        )}

        {items
          .filter((it) => it.status === 'error')
          .map((it) => (
            <div key={it.key} className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-3">
              <img src={it.localUrl} className="h-12 w-12 rounded-lg object-cover" alt="" />
              <p className="flex-1 text-[13px] text-danger">{it.error}</p>
              <Button size="sm" variant="secondary" className="bg-bg" onClick={() => patch(it.key, { status: 'pending', error: undefined })}>
                {t('common.retry')}
              </Button>
              <button onClick={() => patch(it.key, { status: 'discarded' })} aria-label="discard">
                <IconX size={18} className="text-muted" />
              </button>
            </div>
          ))}

        {allDone && (
          <div className="mt-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ink text-on-ink">
              <IconCheck size={30} />
            </div>
            <p className="mt-4 text-[18px] font-bold">{t('add.done', { count: savedCount })}</p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                {t('add.pick')}
              </Button>
              <Button onClick={() => nav('/')}>{t('nav.closet')}</Button>
            </div>
          </div>
        )}
      </div>

      {cur && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-xl md:left-60">
          <div className="mx-auto flex max-w-3xl gap-2 px-5 py-3">
            <Button variant="secondary" onClick={() => discard(cur.key)} disabled={cur.status === 'saving'}>
              {t('common.skip')}
            </Button>
            <Button className="flex-1" size="lg" onClick={saveCurrent} disabled={cur.status === 'saving'}>
              {cur.status === 'saving' ? <Spinner /> : t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ModelBars({ model }: { model: ModelProgress }) {
  const { t } = useTranslation()
  return (
    <div className="mt-5 space-y-3">
      <p className="text-[13px] text-muted">{t('add.modelDownload')}</p>
      {(['seg', 'clip'] as const).map((k) => (
        <div key={k} className="flex items-center gap-3 text-[12px] text-muted">
          <span className="w-16">{t(k === 'seg' ? 'add.modelSeg' : 'add.modelClip')}</span>
          <ProgressBar value={model[k]} />
          <span className="w-9 text-right tabular-nums">{model[k] === null ? '' : `${Math.round(model[k]! * 100)}%`}</span>
        </div>
      ))}
    </div>
  )
}
