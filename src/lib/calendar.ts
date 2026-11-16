/**
 * Utilidades puras del calendario. Las fechas son strings YYYY-MM-DD y se calculan en UTC
 * para que no haya saltos por zona horaria ni por horario de verano.
 */

export type YearMonth = string // 'YYYY-MM'

export interface DayCell {
  date: string
  day: number
  inMonth: boolean
}

const DAY = 86400000
const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function parseYM(ym: YearMonth) {
  const [y, m] = ym.split('-').map(Number)
  return { y, m: m - 1 }
}

export function monthOf(date: string): YearMonth {
  return date.slice(0, 7)
}

export function shiftMonth(ym: YearMonth, n: number): YearMonth {
  const { y, m } = parseYM(ym)
  const d = new Date(Date.UTC(y, m + n, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

/** La semana arranca el lunes en español y el domingo en inglés */
export function weekStartFor(lang: 'es' | 'en'): 0 | 1 {
  return lang === 'en' ? 0 : 1
}

/**
 * Celdas del mes en semanas completas (5 o 6 filas de 7), con los días del mes anterior y
 * siguiente marcados como fuera del mes.
 */
export function monthGrid(ym: YearMonth, weekStart: 0 | 1): DayCell[] {
  const { y, m } = parseYM(ym)
  const first = new Date(Date.UTC(y, m, 1))
  const lead = (first.getUTCDay() - weekStart + 7) % 7
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const total = Math.ceil((lead + daysInMonth) / 7) * 7
  const start = first.getTime() - lead * DAY
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(start + i * DAY)
    return { date: toISO(d), day: d.getUTCDate(), inMonth: d.getUTCMonth() === m }
  })
}

/** Nombres cortos de los días en el orden de la grilla (L M M J V S D) */
export function weekdayLabels(lang: 'es' | 'en', weekStart: 0 | 1) {
  const fmt = new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone: 'UTC' })
  // 2023-01-01 fue domingo
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(2023, 0, 1 + ((i + weekStart) % 7)))))
}

/** Formatea una fecha YYYY-MM-DD sin que la zona horaria la corra un día */
export function fmtDate(date: string, lang: 'es' | 'en', opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(lang, { ...opts, timeZone: 'UTC' }).format(new Date(date))
}

/**
 * Prendas planificadas en el calendario cerca de una fecha: id de prenda → a cuántos días está
 * (el más cercano). No cuenta el mismo día ni lo que está a `window` días o más.
 */
export function recentUse(
  days: Record<string, string>,
  itemsByOutfit: Map<string, string[]>,
  date: string,
  window = 7,
): Record<string, number> {
  const t = Date.parse(date)
  const out: Record<string, number> = {}
  for (const [d, outfitId] of Object.entries(days)) {
    const dist = Math.abs(t - Date.parse(d)) / DAY
    if (dist === 0 || dist >= window) continue
    for (const id of itemsByOutfit.get(outfitId) ?? []) out[id] = Math.min(out[id] ?? Infinity, dist)
  }
  return out
}
