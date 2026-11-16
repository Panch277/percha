import { EMPTY_PREFS } from '../outfits/engine'
import { BUCKET, supabase } from '../supabase'
import type { City, DataStore, Garment, GarmentInput, GarmentWithImage, NewGarmentPayload, Outfit } from './types'

/** Fila tal como está en Postgres (snake_case) */
interface Row {
  id: string
  user_id: string
  brand: string
  description: string
  category: Garment['category']
  subcategory: string
  colors: string[]
  styles: Garment['styles']
  warmth: 1 | 2 | 3
  formality: 1 | 2 | 3
  pattern: boolean | null
  image_path: string
  thumb_path: string
  created_at: string
}

const SIGNED_TTL = 60 * 60 * 6 // 6 h

function sb() {
  if (!supabase) throw new Error('Supabase no configurado')
  return supabase
}

function fromRow(r: Row, imageUrl: string, thumbUrl: string): GarmentWithImage {
  return {
    id: r.id,
    brand: r.brand,
    description: r.description,
    category: r.category,
    subcategory: r.subcategory,
    colors: r.colors ?? [],
    styles: r.styles ?? [],
    warmth: r.warmth,
    formality: r.formality,
    pattern: r.pattern ?? false,
    createdAt: r.created_at,
    imageUrl,
    thumbUrl,
  }
}

function toRow(p: Partial<GarmentInput>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) if (v !== undefined) out[k] = v
  return out
}

async function sign(paths: string[]) {
  if (!paths.length) return new Map<string, string>()
  const { data, error } = await sb().storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL)
  if (error) throw error
  return new Map(data.map((d) => [d.path ?? '', d.signedUrl]))
}

interface OutfitRow {
  id: string
  occasion: Outfit['occasion']
  style: Outfit['style']
  item_ids: string[]
  date: string | null
  tryon_path: string | null
  created_at: string
}

function outfitFromRow(r: OutfitRow): Outfit {
  return {
    id: r.id,
    occasion: r.occasion,
    style: r.style,
    itemIds: r.item_ids ?? [],
    date: r.date,
    tryonPath: r.tryon_path,
    createdAt: r.created_at,
  }
}

async function uid() {
  const { data } = await sb().auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error('Sesión vencida')
  return id
}

function ext(b: Blob) {
  return b.type === 'image/webp' ? 'webp' : 'png'
}

export const supabaseStore: DataStore = {
  kind: 'supabase',

  async list() {
    const { data, error } = await sb().from('garments').select('*').order('created_at', { ascending: false })
    if (error) throw error
    const rows = (data ?? []) as Row[]
    const urls = await sign(rows.flatMap((r) => [r.image_path, r.thumb_path]))
    return rows.map((r) => fromRow(r, urls.get(r.image_path) ?? '', urls.get(r.thumb_path) ?? ''))
  },

  async add({ data, image, thumb }: NewGarmentPayload) {
    const { data: auth } = await sb().auth.getUser()
    const uid = auth.user?.id
    if (!uid) throw new Error('Sesión vencida')
    const id = crypto.randomUUID()
    const imagePath = `${uid}/${id}.${ext(image)}`
    const thumbPath = `${uid}/${id}_thumb.${ext(thumb)}`
    const bucket = sb().storage.from(BUCKET)
    const up1 = await bucket.upload(imagePath, image, { contentType: image.type, upsert: false })
    if (up1.error) throw up1.error
    const up2 = await bucket.upload(thumbPath, thumb, { contentType: thumb.type, upsert: false })
    if (up2.error) throw up2.error

    const { data: row, error } = await sb()
      .from('garments')
      .insert({ id, ...toRow(data), image_path: imagePath, thumb_path: thumbPath })
      .select('*')
      .single()
    if (error) {
      await bucket.remove([imagePath, thumbPath])
      throw error
    }
    const urls = await sign([imagePath, thumbPath])
    return fromRow(row as Row, urls.get(imagePath) ?? '', urls.get(thumbPath) ?? '')
  },

  async update(id, patch) {
    const { error } = await sb().from('garments').update(toRow(patch)).eq('id', id)
    if (error) throw error
  },

  async remove(id) {
    const { data, error } = await sb().from('garments').select('image_path, thumb_path').eq('id', id).single()
    if (error) throw error
    const del = await sb().from('garments').delete().eq('id', id)
    if (del.error) throw del.error
    await sb().storage.from(BUCKET).remove([data.image_path, data.thumb_path])
  },

  async listOutfits() {
    const { data, error } = await sb().from('outfits').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as OutfitRow[]).map(outfitFromRow)
  },

  async addOutfit(o) {
    const { data, error } = await sb()
      .from('outfits')
      .insert({ occasion: o.occasion, style: o.style, item_ids: o.itemIds, date: o.date })
      .select('*')
      .single()
    if (error) throw error
    return outfitFromRow(data as OutfitRow)
  },

  async removeOutfit(id) {
    const { error } = await sb().from('outfits').delete().eq('id', id)
    if (error) throw error
  },

  async getPrefs() {
    const { data, error } = await sb().from('preferences').select('weights, city').maybeSingle()
    if (error) throw error
    return { weights: data?.weights ?? EMPTY_PREFS, city: (data?.city as City | null) ?? null }
  },

  async savePrefs(p) {
    const { error } = await sb()
      .from('preferences')
      .upsert({ user_id: await uid(), weights: p.weights, city: p.city }, { onConflict: 'user_id' })
    if (error) throw error
  },
}
