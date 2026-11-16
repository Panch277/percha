import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { IconPin, IconSearch, IconUser } from '../components/Icons'
import { PageHeader } from '../components/Layout'
import { Button, cx, inputCls, ProgressBar, Segmented, Spinner } from '../components/ui'
import { prepareAvatar } from '../lib/tryon/images'
import { getHfToken, setHfToken } from '../lib/tryon/token'
import { setLanguage } from '../i18n'
import { ai, type ModelProgress } from '../lib/ai/client'
import { useOutfits } from '../lib/outfits/context'
import { searchCity } from '../lib/weather'
import { isDemo } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { ThemePref } from '../lib/theme'
import { useThemePref } from '../App'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const [theme, setTheme] = useThemePref()
  const [email, setEmail] = useState<string | null>(null)
  const [warm, setWarm] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [model, setModel] = useState<ModelProgress>({ seg: null, clip: null })

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])
  useEffect(() => ai.onProgress(setModel), [])

  async function warmup() {
    setWarm('busy')
    try {
      await ai.warmup()
      setWarm('done')
    } catch {
      setWarm('error')
    }
  }

  return (
    <>
      <PageHeader title={t('profile.title')} />
      <div className="mx-auto max-w-xl space-y-4 px-5 pt-4 md:mx-0 md:px-10">
        {isDemo && (
          <Card>
            <div className="flex items-center gap-2 font-semibold">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t('profile.demo')}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{t('profile.demoBody')}</p>
          </Card>
        )}

        <AvatarCard />

        <Card title={t('profile.appearance')}>
          <Label>{t('profile.theme')}</Label>
          <Segmented<ThemePref>
            value={theme}
            onChange={setTheme}
            options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t(`profile.themes.${v}`) }))}
          />
          <Label className="mt-4">{t('profile.language')}</Label>
          <Segmented
            value={i18n.language.startsWith('en') ? 'en' : 'es'}
            onChange={(v) => setLanguage(v as 'es' | 'en')}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Card>

        <Card title={t('profile.city')}>
          <CityPicker />
        </Card>

        <Card title={t('profile.ai')}>
          <p className="text-[13px] leading-relaxed text-muted">{t('profile.aiBody')}</p>
          {warm === 'busy' && (
            <div className="mt-3 space-y-2">
              <ProgressBar value={model.seg} />
              <ProgressBar value={model.clip} />
            </div>
          )}
          <Button variant="secondary" className="mt-3 bg-bg" onClick={warmup} disabled={warm === 'busy' || warm === 'done'}>
            {warm === 'busy' ? <Spinner /> : warm === 'done' ? `✓ ${t('profile.aiReady')}` : warm === 'error' ? t('common.retry') : t('profile.aiWarm')}
          </Button>
        </Card>

        {supabase && (
          <Card title={t('profile.account')}>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[14px] text-muted">{email}</span>
              <Button variant="secondary" size="sm" className="bg-bg" onClick={() => supabase!.auth.signOut()}>
                {t('profile.signOut')}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

/** Foto de cuerpo entero para la prueba virtual: se le saca el fondo y se encuadra en 3:4 */
function AvatarCard() {
  const { t } = useTranslation()
  const { hash } = useLocation()
  const { avatarUrl, setAvatar, removeAvatar } = useOutfits()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [model, setModel] = useState<ModelProgress>({ seg: null, clip: null })
  const ref = useRef<HTMLElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const tips = t('profile.avatarTips', { returnObjects: true }) as string[]

  useEffect(() => ai.onProgress(setModel), [])
  // se llega acá desde "Probármelo" sin avatar: se lleva la tarjeta a la vista y se resalta
  const highlight = hash === '#avatar' && !avatarUrl
  useEffect(() => {
    if (hash !== '#avatar') return
    // un frame después: el Layout sube al tope al cambiar de pantalla y lo pisaría
    const id = requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'center' }))
    return () => cancelAnimationFrame(id)
  }, [hash])

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setNote(null)
    try {
      const { image, cutout } = await prepareAvatar(file)
      await setAvatar(image)
      if (!cutout) setNote(t('profile.avatarNoCutout'))
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    if (!confirm(t('profile.avatarRemoveConfirm'))) return
    setBusy(true)
    try {
      await removeAvatar()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section ref={ref} className={cx('rounded-3xl bg-surface p-5 transition', highlight && 'ring-2 ring-accent')}>
      <h2 className="mb-3 text-[15px] font-semibold">{t('profile.avatar')}</h2>
      <div className="flex gap-4">
        <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-2xl bg-tile">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-black/25">
              <IconUser size={40} />
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-bg/60">
              <Spinner />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-relaxed text-muted">{t('profile.avatarBody')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
              {t(avatarUrl ? 'profile.avatarChange' : 'profile.avatarUpload')}
            </Button>
            {avatarUrl && (
              <Button size="sm" variant="secondary" className="bg-bg" onClick={onRemove} disabled={busy}>
                {t('profile.avatarRemove')}
              </Button>
            )}
          </div>
          {busy && model.seg !== null && model.seg < 1 && (
            <div className="mt-3">
              <ProgressBar value={model.seg} />
            </div>
          )}
          {busy && <p className="mt-2 text-[12px] text-muted">{t('profile.avatarProcessing')}</p>}
          {note && <p className="mt-2 text-[12px] text-danger">{note}</p>}
        </div>
      </div>
      <ul className="mt-4 space-y-1 text-[12.5px] leading-relaxed text-muted">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted" />
            {tip}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-2xl bg-bg p-3 text-[12px] leading-relaxed text-muted">{t('profile.avatarPrivacy')}</p>
      <HfTokenField />
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </section>
  )
}

/** Token de Hugging Face opcional: más cuota de GPU para la prueba virtual. Solo en este dispositivo. */
function HfTokenField() {
  const { t } = useTranslation()
  const [saved, setSaved] = useState(() => !!getHfToken())
  const [value, setValue] = useState('')
  const valid = value.trim().startsWith('hf_') && value.trim().length > 10

  return (
    <details className="group mt-3 rounded-2xl bg-bg px-3 py-2.5" open={saved || undefined}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium">
        {t('profile.hfToken')}
        {saved && <span className="text-[12px] font-semibold text-accent">✓ {t('profile.hfTokenSaved')}</span>}
      </summary>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        {t('profile.hfTokenBody')}{' '}
        <a className="underline" href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">
          huggingface.co/settings/tokens
        </a>
      </p>
      {saved ? (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          onClick={() => {
            setHfToken(null)
            setSaved(false)
          }}
        >
          {t('profile.hfTokenRemove')}
        </Button>
      ) : (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            setHfToken(value)
            setValue('')
            setSaved(true)
          }}
        >
          <input
            className={inputCls + ' h-10 text-[14px]'}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="hf_…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button size="sm" className="h-10 shrink-0" disabled={!valid}>
            {t('common.save')}
          </Button>
        </form>
      )}
    </details>
  )
}

function CityPicker() {
  const { t, i18n } = useTranslation()
  const { prefs, setCity } = useOutfits()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchCity>> | null>(null)

  async function search(e: FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      setResults(await searchCity(q.trim(), i18n.language.startsWith('en') ? 'en' : 'es'))
    } catch {
      setResults([])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-muted">{t('profile.cityBody')}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium">
          <IconPin size={17} className="shrink-0" />
          <span className="truncate">{prefs.city?.name ?? t('profile.cityAuto')}</span>
        </span>
        {prefs.city && (
          <Button variant="secondary" size="sm" className="bg-bg" onClick={() => setCity(null)}>
            {t('profile.cityAuto')}
          </Button>
        )}
      </div>
      <form onSubmit={search} className="mt-3 flex gap-2">
        <input className={inputCls + ' bg-bg'} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('profile.cityPlaceholder')} />
        <Button type="submit" variant="secondary" className="h-12 shrink-0 bg-bg" disabled={busy} aria-label={t('profile.cityPlaceholder')}>
          {busy ? <Spinner /> : <IconSearch size={18} />}
        </Button>
      </form>
      {results && (
        <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-bg">
          {results.length === 0 && <p className="px-4 py-3 text-[13px] text-muted">{t('profile.cityNone')}</p>}
          {results.map((c) => (
            <button
              key={`${c.lat},${c.lon}`}
              type="button"
              className="block w-full px-4 py-3 text-left hover:bg-surface"
              onClick={() => {
                setCity({ name: c.name, lat: c.lat, lon: c.lon })
                setResults(null)
                setQ('')
              }}
            >
              <div className="text-[14px] font-medium">{c.name}</div>
              <div className="text-[12px] text-muted">{c.detail}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5">
      {title && <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted ${className}`}>{children}</div>
}
