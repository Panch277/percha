import Dexie, { type Table } from 'dexie'
import type { DataStore, Garment, GarmentWithImage, NewGarmentPayload } from './types'

interface LocalRow extends Garment {
  image: Blob
  thumb: Blob
}

class LocalDB extends Dexie {
  garments!: Table<LocalRow, string>
  constructor() {
    super('percha')
    this.version(1).stores({ garments: 'id, category, brand, createdAt' })
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
  return { ...rest, imageUrl: urls.image, thumbUrl: urls.thumb }
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
}
