import Dexie, { type Table } from 'dexie'
import { EMPTY_PREFS } from '../outfits/engine'
import type { CalendarEntry, DataStore, Garment, GarmentWithImage, NewGarmentPayload, Outfit, UserPrefs } from './types'

interface LocalRow extends Garment {
  image: Blob
  thumb: Blob
}

interface PrefsRow extends UserPrefs {
  key: 'me'
}

/** Imágenes sueltas: el avatar ('avatar') y los renders ('tryon:<outfitId>') */
interface MediaRow {
  key: string
  blob: Blob
}

type OutfitRow = Omit<Outfit, 'tryonUrl'>

class LocalDB extends Dexie {
  garments!: Table<LocalRow, string>
  outfits!: Table<OutfitRow, string>
  prefs!: Table<PrefsRow, string>
  calendar!: Table<CalendarEntry, string>
  media!: Table<MediaRow, string>
  constructor() {
    super('percha')
    this.version(1).stores({ garments: 'id, category, brand, createdAt' })
    // v2 (entrega 2): outfits guardados y preferencias
    this.version(2).stores({ outfits: 'id, createdAt', prefs: 'key' })
    // v3 (entrega 3): calendario, un outfit por día
    this.version(3).stores({ calendar: 'date, outfitId' })
    // v4 (entrega 4): avatar y renders de la prueba virtual
    this.version(4).stores({ media: 'key' })
  }
}

const db = new LocalDB()
const urlCache = new Map<string, { image: string; thumb: string }>()
/** object URLs de media, por clave; se revocan al reemplazar o borrar */
const mediaUrls = new Map<string, string>()

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

async function mediaUrl(key: string) {
  const hit = mediaUrls.get(key)
  if (hit) return hit
  const row = await db.media.get(key)
  if (!row) return null
  const url = URL.createObjectURL(row.blob)
  mediaUrls.set(key, url)
  return url
}

async function putMedia(key: string, blob: Blob) {
  await db.media.put({ key, blob })
  dropMediaUrl(key)
  return (await mediaUrl(key))!
}

function dropMediaUrl(key: string) {
  const u = mediaUrls.get(key)
  if (u) URL.revokeObjectURL(u)
  mediaUrls.delete(key)
}

const tryonKey = (outfitId: string) => `tryon:${outfitId}`

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
    const rows = await db.outfits.orderBy('createdAt').reverse().toArray()
    return Promise.all(rows.map(async (r) => ({ ...r, tryonUrl: r.tryonPath ? await mediaUrl(r.tryonPath) : null })))
  },
  async addOutfit(o) {
    const row: OutfitRow = { ...o, id: crypto.randomUUID(), tryonPath: null, createdAt: new Date().toISOString() }
    await db.outfits.add(row)
    return { ...row, tryonUrl: null }
  },
  async removeOutfit(id) {
    // mismo efecto que el "on delete cascade" de Postgres (y se lleva el render)
    await db.transaction('rw', db.outfits, db.calendar, db.media, async () => {
      await db.calendar.where('outfitId').equals(id).delete()
      await db.media.delete(tryonKey(id))
      await db.outfits.delete(id)
    })
    dropMediaUrl(tryonKey(id))
  },

  async listCalendar() {
    return db.calendar.toArray()
  },
  async setDay(date, outfitId) {
    await db.calendar.put({ date, outfitId })
  },
  async clearDay(date) {
    await db.calendar.delete(date)
  },

  async getPrefs() {
    const row = await db.prefs.get('me')
    return { weights: row?.weights ?? EMPTY_PREFS, city: row?.city ?? null }
  },
  async savePrefs(p) {
    await db.prefs.put({ ...p, key: 'me' })
  },

  async getAvatar() {
    return mediaUrl('avatar')
  },
  async setAvatar(image) {
    return putMedia('avatar', image)
  },
  async removeAvatar() {
    await db.media.delete('avatar')
    dropMediaUrl('avatar')
  },

  async setTryOn(outfitId, image) {
    const key = tryonKey(outfitId)
    const url = await putMedia(key, image)
    await db.outfits.update(outfitId, { tryonPath: key })
    return url
  },
  async clearTryOn(outfitId) {
    const key = tryonKey(outfitId)
    await db.media.delete(key)
    await db.outfits.update(outfitId, { tryonPath: null })
    dropMediaUrl(key)
  },
}
