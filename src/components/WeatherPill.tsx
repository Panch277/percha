import { useTranslation } from 'react-i18next'
import type { WeatherState } from '../lib/useDayWeather'
import { weatherKind } from '../lib/weather'
import { IconCloud, IconPin, IconRain, IconSnow, IconStorm, IconSun } from './Icons'
import { cx, Spinner } from './ui'

/** Clima del día en una píldora: "☀ 27° / 20° · 30% lluvia · Buenos Aires" */
export function WeatherPill({ wx, onSetCity, className }: { wx: WeatherState; onSetCity: () => void; className?: string }) {
  const { t } = useTranslation()
  const base = cx('inline-flex h-9 items-center gap-2 rounded-full bg-surface px-4 text-[13px]', className)
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
