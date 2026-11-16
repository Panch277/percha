import Dexie, { type Table } from 'dexie'
import { EMPTY_PREFS } from '../outfits/engine'
import type { DataStore, Garment, GarmentWithImage, NewGarmentPayload, Outfit, UserPrefs } from './types'

interface LocalRow extends Garment {
  image: Blob
  thumb: Blob
}

interface PrefsRow extends UserPrefs {
  key: 'me'
}

class LocalDB extends Dexie {
  garments!: Table<LocalRow, string>
  outfits!: Table<Outfit, string>
  prefs!: Table<PrefsRow, string>
  constructor() {
    super('percha')
    this.version(1).stores({ garments: 'id, category, brand, createdAt' })
    // v2 (entrega 2): outfits guardados y preferencias
    this.version(2).stores({ outfits: 'id, createdAt', prefs: 'key' })
  }
}

const db = new LocalDB()
const urlCache = new Map<string, { image: string; thumb: string }>()

function withUrls(row: LocalRow): GarmentWithImage {
  let urls = urlCache.get(row.id)
  if (!urls) {
    urls = { image: URL.createObjectURL(row.image), thumb: URL.createObjectURL(row.thumb) }
    urlCache.set(row.id, urls)
  }
  const { image: _i, thumb: _t, ...rest } = row
  // las prendas cargadas antes de la entrega 2 no tienen `pattern`
  return { ...rest, pattern: rest.pattern ?? false, imageUrl: urls.image, thumbUrl: urls.thumb }
}

function revoke(id: string) {
  const u = urlCache.get(id)
  if (u) {
    URL.revokeObjectURL(u.image)
    URL.revokeObjectURL(u.thumb)
    urlCache.delete(id)
  }
}

export const localStore: DataStore = {
  kind: 'local',
  async list() {
    const rows = await db.garments.orderBy('createdAt').reverse().toArray()
    return rows.map(withUrls)
  },
  async add({ data, image, thumb }: NewGarmentPayload) {
    const row: LocalRow = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), image, thumb }
    await db.garments.add(row)
    return withUrls(row)
  },
  async update(id, patch) {
    await db.garments.update(id, patch)
  },
  async remove(id) {
    await db.garments.delete(id)
    revoke(id)
  },

  async listOutfits() {
    return db.outfits.orderBy('createdAt').reverse().toArray()
  },
  async addOutfit(o) {
    const row: Outfit = { ...o, id: crypto.randomUUID(), tryonPath: null, createdAt: new Date().toISOString() }
    await db.outfits.add(row)
    return row
  },
  async removeOutfit(id) {
    await db.outfits.delete(id)
  },

  async getPrefs() {
    const row = await db.prefs.get('me')
    return { weights: row?.weights ?? EMPTY_PREFS, city: row?.city ?? null }
  },
  async savePrefs(p) {
    await db.prefs.put({ ...p, key: 'me' })
  },
}
