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

function outfitFromRow(r: OutfitRow, tryonUrl: string | null = null): Outfit {
  return {
    id: r.id,
    occasion: r.occasion,
    style: r.style,
    itemIds: r.item_ids ?? [],
    date: r.date,
    tryonPath: r.tryon_path,
    tryonUrl,
    createdAt: r.created_at,
  }
}

/** Sube una imagen con nombre único (el bucket no tiene política de update) y la firma */
async function uploadUnique(prefix: string, image: Blob) {
  const path = `${await uid()}/${prefix}-${Date.now()}.${ext(image)}`
  const up = await sb().storage.from(BUCKET).upload(path, image, { contentType: image.type, upsert: false })
  if (up.error) throw up.error
  const urls = await sign([path])
  return { path, url: urls.get(path) ?? '' }
}

async function removeFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p)
  if (list.length) await sb().storage.from(BUCKET).remove(list)
}

async function uid() {
  const { data } = await sb().auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error('Sesión vencida')
  return id
}

function ext(b: Blob) {
  return b.type === 'image/webp' ? 'webp' : b.type === 'image/jpeg' ? 'jpg' : 'png'
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
    const rows = (data ?? []) as OutfitRow[]
    const urls = await sign(rows.map((r) => r.tryon_path).filter((p): p is string => !!p))
    return rows.map((r) => outfitFromRow(r, r.tryon_path ? (urls.get(r.tryon_path) ?? null) : null))
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
    // el render vive en Storage: el cascade de Postgres no lo borra
    const { data } = await sb().from('outfits').select('tryon_path').eq('id', id).maybeSingle()
    const { error } = await sb().from('outfits').delete().eq('id', id)
    if (error) throw error
    await removeFiles([data?.tryon_path])
  },

  async listCalendar() {
    const { data, error } = await sb().from('calendar_entries').select('date, outfit_id')
    if (error) throw error
    return ((data ?? []) as { date: string; outfit_id: string }[]).map((r) => ({ date: r.date, outfitId: r.outfit_id }))
  },

  async setDay(date, outfitId) {
    const { error } = await sb()
      .from('calendar_entries')
      .upsert({ user_id: await uid(), date, outfit_id: outfitId }, { onConflict: 'user_id,date' })
    if (error) throw error
  },

  async clearDay(date) {
    const { error } = await sb().from('calendar_entries').delete().eq('date', date)
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

  async getAvatar() {
    const { data, error } = await sb().from('preferences').select('avatar_path').maybeSingle()
    if (error) throw error
    if (!data?.avatar_path) return null
    return (await sign([data.avatar_path])).get(data.avatar_path) ?? null
  },

  async setAvatar(image) {
    const { data: old } = await sb().from('preferences').select('avatar_path').maybeSingle()
    const { path, url } = await uploadUnique('avatar', image)
    const { error } = await sb().from('preferences').upsert({ user_id: await uid(), avatar_path: path }, { onConflict: 'user_id' })
    if (error) {
      await removeFiles([path])
      throw error
    }
    await removeFiles([old?.avatar_path])
    return url
  },

  async removeAvatar() {
    const { data: old } = await sb().from('preferences').select('avatar_path').maybeSingle()
    const { error } = await sb().from('preferences').update({ avatar_path: null }).eq('user_id', await uid())
    if (error) throw error
    await removeFiles([old?.avatar_path])
  },

  async setTryOn(outfitId, image) {
    const { data: old } = await sb().from('outfits').select('tryon_path').eq('id', outfitId).maybeSingle()
    const { path, url } = await uploadUnique(`tryon/${outfitId}`, image)
    const { error } = await sb().from('outfits').update({ tryon_path: path }).eq('id', outfitId)
    if (error) {
      await removeFiles([path])
      throw error
    }
    await removeFiles([old?.tryon_path])
    return url
  },

  async clearTryOn(outfitId) {
    const { data: old } = await sb().from('outfits').select('tryon_path').eq('id', outfitId).maybeSingle()
    const { error } = await sb().from('outfits').update({ tryon_path: null }).eq('id', outfitId)
    if (error) throw error
    await removeFiles([old?.tryon_path])
  },
}
