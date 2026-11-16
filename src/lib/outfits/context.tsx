import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type City, type Outfit, type OutfitInput, store, type UserPrefs } from '../store'
import { applyFeedback, EMPTY_PREFS } from './engine'

interface Ctx {
  saved: Outfit[]
  prefs: UserPrefs
  /** calendario: fecha (YYYY-MM-DD) → id del outfit */
  days: Record<string, string>
  loading: boolean
  save: (o: OutfitInput) => Promise<Outfit>
  remove: (id: string) => Promise<void>
  /** like (+1) o dislike (-1) sobre un conjunto de prendas */
  vote: (itemIds: string[], v: 1 | -1) => Promise<void>
  setCity: (c: City | null) => Promise<void>
  assignDay: (date: string, outfitId: string) => Promise<void>
  clearDay: (date: string) => Promise<void>
}

const OutfitsContext = createContext<Ctx | null>(null)

export function OutfitsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Outfit[]>([])
  const [prefs, setPrefs] = useState<UserPrefs>({ weights: EMPTY_PREFS, city: null })
  const [days, setDays] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  // la última versión, para encadenar votos rápidos sin perder ninguno
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    let alive = true
    // el calendario va aparte: si su tabla falla (migración sin correr), lo demás funciona igual
    const cal = store
      .listCalendar()
      .then((entries) => alive && setDays(Object.fromEntries(entries.map((e) => [e.date, e.outfitId]))))
      .catch((e) => console.warn('[calendar] no se pudo cargar', e))
    const rest = Promise.all([store.listOutfits(), store.getPrefs()])
      .then(([o, p]) => {
        if (!alive) return
        setSaved(o)
        setPrefs(p)
      })
      .catch((e) => console.warn('[outfits] no se pudieron cargar', e))
    Promise.all([cal, rest]).finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const persist = useCallback(async (next: UserPrefs) => {
    prefsRef.current = next
    setPrefs(next)
    await store.savePrefs(next)
  }, [])

  const save = useCallback(async (o: OutfitInput) => {
    const out = await store.addOutfit(o)
    setSaved((prev) => [out, ...prev])
    return out
  }, [])

  const remove = useCallback(async (id: string) => {
    await store.removeOutfit(id)
    setSaved((prev) => prev.filter((o) => o.id !== id))
    // el borrado en cascada también libera los días del calendario
    setDays((prev) => Object.fromEntries(Object.entries(prev).filter(([, oid]) => oid !== id)))
  }, [])

  const vote = useCallback(
    (ids: string[], v: 1 | -1) => persist({ ...prefsRef.current, weights: applyFeedback(prefsRef.current.weights, ids, v) }),
    [persist],
  )

  const setCity = useCallback((city: City | null) => persist({ ...prefsRef.current, city }), [persist])

  const assignDay = useCallback(async (date: string, outfitId: string) => {
    await store.setDay(date, outfitId)
    setDays((prev) => ({ ...prev, [date]: outfitId }))
  }, [])

  const clearDay = useCallback(async (date: string) => {
    await store.clearDay(date)
    setDays((prev) => {
      const next = { ...prev }
      delete next[date]
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ saved, prefs, days, loading, save, remove, vote, setCity, assignDay, clearDay }),
    [saved, prefs, days, loading, save, remove, vote, setCity, assignDay, clearDay],
  )
  return <OutfitsContext.Provider value={value}>{children}</OutfitsContext.Provider>
}

export function useOutfits() {
  const c = useContext(OutfitsContext)
  if (!c) throw new Error('useOutfits fuera de OutfitsProvider')
  return c
}
