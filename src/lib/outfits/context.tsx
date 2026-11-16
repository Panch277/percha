import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useGarments } from '../garments'
import { type City, type Outfit, type OutfitInput, store, type UserPrefs } from '../store'
import { compressResult, garmentForTryOn } from '../tryon/images'
import { ootdProvider } from '../tryon/ootd'
import { tryOnParts } from '../tryon/plan'
import { TryOnError, type TryOnErrorCode, type TryOnStage } from '../tryon/types'
import { applyFeedback, EMPTY_PREFS, slotsFromIds } from './engine'

/** Estado de una prueba virtual en curso (o fallida) por outfit */
export type TryOnJob = { stage: TryOnStage } | { error: TryOnErrorCode; partial?: boolean }

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
  /** foto del avatar (URL lista para <img>) */
  avatarUrl: string | null
  setAvatar: (image: Blob) => Promise<void>
  removeAvatar: () => Promise<void>
  /** pruebas virtuales en curso o con error, por id de outfit */
  jobs: Record<string, TryOnJob>
  tryOn: (outfit: Outfit) => Promise<void>
  clearTryOn: (outfitId: string) => Promise<void>
  dismissJob: (outfitId: string) => void
}

const OutfitsContext = createContext<Ctx | null>(null)

export function OutfitsProvider({ children }: { children: ReactNode }) {
  const { items } = useGarments()
  const [saved, setSaved] = useState<Outfit[]>([])
  const [prefs, setPrefs] = useState<UserPrefs>({ weights: EMPTY_PREFS, city: null })
  const [days, setDays] = useState<Record<string, string>>({})
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Record<string, TryOnJob>>({})
  const [loading, setLoading] = useState(true)
  // la última versión, para encadenar votos rápidos sin perder ninguno
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  // lo que necesita tryOn sin re-crearse en cada render
  const live = useRef({ items, avatarUrl })
  live.current = { items, avatarUrl }

  useEffect(() => {
    let alive = true
    // calendario y avatar van aparte: si su tabla o columna falla (migración sin correr),
    // lo demás funciona igual
    const cal = store
      .listCalendar()
      .then((entries) => alive && setDays(Object.fromEntries(entries.map((e) => [e.date, e.outfitId]))))
      .catch((e) => console.warn('[calendar] no se pudo cargar', e))
    store
      .getAvatar()
      .then((u) => alive && setAvatarUrl(u))
      .catch((e) => console.warn('[avatar] no se pudo cargar', e))
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

  const setAvatar = useCallback(async (image: Blob) => {
    setAvatarUrl(await store.setAvatar(image))
  }, [])

  const removeAvatar = useCallback(async () => {
    await store.removeAvatar()
    setAvatarUrl(null)
  }, [])

  const patchOutfit = (id: string, p: Partial<Outfit>) => setSaved((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)))
  const setJob = (id: string, job: TryOnJob | null) =>
    setJobs((prev) => {
      const next = { ...prev }
      if (job) next[id] = job
      else delete next[id]
      return next
    })

  const tryOn = useCallback(async (outfit: Outfit) => {
    const outfitId = outfit.id
    const { items, avatarUrl } = live.current
    try {
      if (!avatarUrl) throw new TryOnError('no_avatar')
      const garments = new Map(items.map((g) => [g.id, g]))
      const { upper, lower } = tryOnParts(slotsFromIds(outfit.itemIds, garments))
      const upperImg = upper ? garments.get(upper)?.imageUrl : undefined
      const lowerImg = lower ? garments.get(lower)?.imageUrl : undefined
      if (!upperImg && !lowerImg) throw new TryOnError('no_garments')
      setJob(outfitId, { stage: { kind: 'connecting' } })
      const [person, upperBlob, lowerBlob] = await Promise.all([
        fetch(avatarUrl).then((r) => r.blob()),
        upperImg ? garmentForTryOn(upperImg) : null,
        lowerImg ? garmentForTryOn(lowerImg) : null,
      ])
      const result = await ootdProvider.run({ person, upper: upperBlob, lower: lowerBlob }, (stage) => setJob(outfitId, { stage }))
      setJob(outfitId, { stage: { kind: 'saving' } })
      const url = await store.setTryOn(outfitId, await compressResult(result))
      patchOutfit(outfitId, { tryonUrl: url, tryonPath: 'set' })
      setJob(outfitId, null)
    } catch (e) {
      console.warn('[tryon]', e)
      const code = e instanceof TryOnError ? e.code : 'failed'
      // salió arriba y falló abajo: se guarda lo que hay, con aviso
      if (e instanceof TryOnError && e.partial) {
        try {
          const url = await store.setTryOn(outfitId, await compressResult(e.partial))
          patchOutfit(outfitId, { tryonUrl: url, tryonPath: 'set' })
          setJob(outfitId, { error: code, partial: true })
          return
        } catch (e2) {
          console.warn('[tryon] no se pudo guardar el parcial', e2)
        }
      }
      setJob(outfitId, { error: code })
    }
  }, [])

  const clearTryOn = useCallback(async (outfitId: string) => {
    await store.clearTryOn(outfitId)
    patchOutfit(outfitId, { tryonUrl: null, tryonPath: null })
  }, [])

  const dismissJob = useCallback((outfitId: string) => setJob(outfitId, null), [])

  const value = useMemo(
    () => ({
      saved,
      prefs,
      days,
      loading,
      save,
      remove,
      vote,
      setCity,
      assignDay,
      clearDay,
      avatarUrl,
      setAvatar,
      removeAvatar,
      jobs,
      tryOn,
      clearTryOn,
      dismissJob,
    }),
    [saved, prefs, days, loading, save, remove, vote, setCity, assignDay, clearDay, avatarUrl, setAvatar, removeAvatar, jobs, tryOn, clearTryOn, dismissJob],
  )
  return <OutfitsContext.Provider value={value}>{children}</OutfitsContext.Provider>
}

export function useOutfits() {
  const c = useContext(OutfitsContext)
  if (!c) throw new Error('useOutfits fuera de OutfitsProvider')
  return c
}
