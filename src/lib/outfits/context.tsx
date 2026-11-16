import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type City, type Outfit, type OutfitInput, store, type UserPrefs } from '../store'
import { applyFeedback, EMPTY_PREFS } from './engine'

interface Ctx {
  saved: Outfit[]
  prefs: UserPrefs
  loading: boolean
  save: (o: OutfitInput) => Promise<Outfit>
  remove: (id: string) => Promise<void>
  /** like (+1) o dislike (-1) sobre un conjunto de prendas */
  vote: (itemIds: string[], v: 1 | -1) => Promise<void>
  setCity: (c: City | null) => Promise<void>
}

const OutfitsContext = createContext<Ctx | null>(null)

export function OutfitsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Outfit[]>([])
  const [prefs, setPrefs] = useState<UserPrefs>({ weights: EMPTY_PREFS, city: null })
  const [loading, setLoading] = useState(true)
  // la última versión, para encadenar votos rápidos sin perder ninguno
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    let alive = true
    Promise.all([store.listOutfits(), store.getPrefs()])
      .then(([o, p]) => {
        if (!alive) return
        setSaved(o)
        setPrefs(p)
      })
      .catch((e) => console.warn('[outfits] no se pudieron cargar', e))
      .finally(() => alive && setLoading(false))
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
  }, [])

  const vote = useCallback(
    (ids: string[], v: 1 | -1) => persist({ ...prefsRef.current, weights: applyFeedback(prefsRef.current.weights, ids, v) }),
    [persist],
  )

  const setCity = useCallback((city: City | null) => persist({ ...prefsRef.current, city }), [persist])

  const value = useMemo(() => ({ saved, prefs, loading, save, remove, vote, setCity }), [saved, prefs, loading, save, remove, vote, setCity])
  return <OutfitsContext.Provider value={value}>{children}</OutfitsContext.Provider>
}

export function useOutfits() {
  const c = useContext(OutfitsContext)
  if (!c) throw new Error('useOutfits fuera de OutfitsProvider')
  return c
}
