import { useEffect, useState } from 'react'
import type { City } from './store'
import { currentPosition, type DayWeather, forecast } from './weather'

export type WeatherState =
  | { status: 'loading' }
  | { status: 'ok'; w: DayWeather; place: string | null }
  /** sin ciudad y sin permiso de ubicación */
  | { status: 'noLocation' }
  /** fecha fuera del rango del pronóstico */
  | { status: 'outOfRange' }
  | { status: 'error' }

/** Clima del día elegido: ciudad guardada o, si no hay, ubicación del navegador */
export function useDayWeather(date: string, city: City | null, ready = true): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: 'loading' })
  const lat = city?.lat
  const lon = city?.lon
  const name = city?.name ?? null

  useEffect(() => {
    if (!ready) return
    let alive = true
    setState({ status: 'loading' })
    ;(async () => {
      let pos: { lat: number; lon: number }
      if (lat !== undefined && lon !== undefined) pos = { lat, lon }
      else {
        try {
          pos = await currentPosition()
        } catch {
          if (alive) setState({ status: 'noLocation' })
          return
        }
      }
      try {
        const w = await forecast(pos.lat, pos.lon, date)
        if (alive) setState(w ? { status: 'ok', w, place: name } : { status: 'outOfRange' })
      } catch {
        if (alive) setState({ status: 'error' })
      }
    })()
    return () => {
      alive = false
    }
  }, [date, lat, lon, name, ready])

  return state
}
