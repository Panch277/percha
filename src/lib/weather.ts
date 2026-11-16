/**
 * Clima del día con Open-Meteo (gratis, sin API key).
 * Ubicación: la ciudad guardada en Perfil o, si no hay, la geolocalización del navegador.
 * Las coordenadas se redondean a 2 decimales (~1 km): alcanza para el pronóstico.
 */
import type { Weather } from './outfits/engine'
import type { City } from './store'

export interface DayWeather extends Weather {
  /** código WMO del día (0 despejado … 95 tormenta) */
  code: number
}

export type WeatherKind = 'sun' | 'cloud' | 'rain' | 'snow' | 'storm'

export function weatherKind(code: number): WeatherKind {
  if (code >= 95) return 'storm'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 51) return 'rain'
  if (code >= 2) return 'cloud'
  return 'sun'
}

const round = (x: number) => Math.round(x * 100) / 100
const TTL = 60 * 60 * 1000

/** Pronóstico de un día. null si la fecha está fuera de rango (Open-Meteo da ~16 días). */
export async function forecast(lat: number, lon: number, date: string): Promise<DayWeather | null> {
  const key = `percha.wx.${round(lat)},${round(lon)},${date}`
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    if (hit && Date.now() - hit.at < TTL) return hit.w
  } catch {
    /* sin storage */
  }
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(round(lat)),
    longitude: String(round(lon)),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'auto',
    start_date: date,
    end_date: date,
  }).toString()
  const res = await fetch(url)
  if (res.status === 400) return null // fecha fuera del rango del pronóstico
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const d = (await res.json()).daily
  if (!d?.time?.length || d.temperature_2m_max[0] === null) return null
  const w: DayWeather = {
    tMax: d.temperature_2m_max[0],
    tMin: d.temperature_2m_min[0],
    rainProb: d.precipitation_probability_max[0] ?? 0,
    code: d.weather_code[0] ?? 0,
  }
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), w }))
  } catch {
    /* sin storage */
  }
  return w
}

/** Busca ciudades por nombre (para elegir una en Perfil) */
export async function searchCity(name: string, lang: 'es' | 'en'): Promise<(City & { detail: string })[]> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({ name, count: '6', language: lang, format: 'json' }).toString()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const j = await res.json()
  return (j.results ?? []).map((r: { name: string; latitude: number; longitude: number; admin1?: string; country?: string }) => ({
    name: r.name,
    lat: round(r.latitude),
    lon: round(r.longitude),
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
  }))
}

/** Ubicación actual del navegador (pide permiso la primera vez) */
export function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('geolocation'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: round(p.coords.latitude), lon: round(p.coords.longitude) }),
      reject,
      { maximumAge: 30 * 60 * 1000, timeout: 10000 },
    )
  })
}

/** Fecha local en formato YYYY-MM-DD */
export function isoDate(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
