import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { store, type GarmentInput, type GarmentWithImage, type NewGarmentPayload } from './store'

interface Ctx {
  items: GarmentWithImage[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  add: (p: NewGarmentPayload) => Promise<GarmentWithImage>
  update: (id: string, patch: Partial<GarmentInput>) => Promise<void>
  remove: (id: string) => Promise<void>
  brands: string[]
}

const GarmentsContext = createContext<Ctx | null>(null)

export function GarmentsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<GarmentWithImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await store.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(async (p: NewGarmentPayload) => {
    const g = await store.add(p)
    setItems((prev) => [g, ...prev])
    return g
  }, [])

  const update = useCallback(async (id: string, patch: Partial<GarmentInput>) => {
    await store.update(id, patch)
    setItems((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))
  }, [])

  const remove = useCallback(async (id: string) => {
    await store.remove(id)
    setItems((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const brands = useMemo(
    () => [...new Set(items.map((g) => g.brand.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items],
  )

  const value = useMemo(
    () => ({ items, loading, error, refresh, add, update, remove, brands }),
    [items, loading, error, refresh, add, update, remove, brands],
  )
  return <GarmentsContext.Provider value={value}>{children}</GarmentsContext.Provider>
}

export function useGarments() {
  const c = useContext(GarmentsContext)
  if (!c) throw new Error('useGarments fuera de GarmentsProvider')
  return c
}
