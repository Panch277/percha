import { BUCKET, supabase } from '../supabase'
import type { DataStore, Garment, GarmentInput, GarmentWithImage, NewGarmentPayload } from './types'

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
}
