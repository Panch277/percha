import { describe, expect, it } from 'vitest'
import { monthGrid, recentUse, shiftMonth, weekdayLabels } from './calendar.ts'

describe('grilla del mes', () => {
  it('noviembre 2026 empieza en domingo: con semana desde el lunes hay 6 días del mes anterior', () => {
    const g = monthGrid('2026-11', 1)
    expect(g.length % 7).toBe(0)
    expect(g[0]).toEqual({ date: '2026-10-26', day: 26, inMonth: false })
    expect(g[6]).toEqual({ date: '2026-11-01', day: 1, inMonth: true })
    expect(g.filter((c) => c.inMonth)).toHaveLength(30)
    expect(g.at(-1)!.date).toBe('2026-12-06')
  })
  it('con semana desde el domingo, el 1 de noviembre 2026 es la primera celda', () => {
    const g = monthGrid('2026-11', 0)
    expect(g[0].date).toBe('2026-11-01')
    expect(g).toHaveLength(35)
  })
  it('febrero 2027 (28 días, empieza en lunes) entra justo en 4 semanas', () => {
    expect(monthGrid('2027-02', 1)).toHaveLength(28)
  })
  it('agosto 2026 necesita 6 semanas desde el lunes', () => {
    expect(monthGrid('2026-08', 1)).toHaveLength(42)
  })
  it('cambia de mes y de año', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', 0)).toBe('2026-11')
  })
  it('nombres de los días en el orden de la grilla', () => {
    expect(weekdayLabels('es', 1)).toHaveLength(7)
    expect(weekdayLabels('en', 0)[0]).toBe('S')
    expect(weekdayLabels('en', 1)[0]).toBe('M')
  })
})

describe('uso reciente desde el calendario', () => {
  const items = new Map([
    ['o1', ['remera', 'jean']],
    ['o2', ['jean', 'zapatillas']],
  ])
  it('devuelve la distancia en días al uso más cercano, sin contar el mismo día', () => {
    const days = { '2026-11-14': 'o1', '2026-11-18': 'o2', '2026-11-16': 'o1' }
    expect(recentUse(days, items, '2026-11-16')).toEqual({ remera: 2, jean: 2, zapatillas: 2 })
  })
  it('ignora lo que está a 7 días o más', () => {
    expect(recentUse({ '2026-11-09': 'o1', '2026-11-23': 'o2' }, items, '2026-11-16')).toEqual({})
  })
})
