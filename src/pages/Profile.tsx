import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPin, IconSearch, IconUser } from '../components/Icons'
import { PageHeader } from '../components/Layout'
import { Button, inputCls, ProgressBar, Segmented, Spinner } from '../components/ui'
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

        <Card>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-bg text-muted">
              <IconUser size={30} />
            </div>
            <div>
              <div className="font-semibold">{t('profile.avatar')}</div>
              <p className="text-[13px] leading-snug text-muted">{t('profile.avatarBody')}</p>
            </div>
          </div>
        </Card>

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
