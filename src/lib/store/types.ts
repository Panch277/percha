import type { CategoryKey, StyleKey } from '../taxonomy'

export interface Garment {
  id: string
  brand: string
  description: string
  category: CategoryKey
  subcategory: string
  /** claves de COLORS, la primera es la dominante */
  colors: string[]
  styles: StyleKey[]
  warmth: 1 | 2 | 3
  formality: 1 | 2 | 3
  createdAt: string
}

export type GarmentInput = Omit<Garment, 'id' | 'createdAt'>

export interface GarmentWithImage extends Garment {
  /** URL lista para <img> (object URL o URL firmada) */
  imageUrl: string
  thumbUrl: string
}

export interface NewGarmentPayload {
  data: GarmentInput
  image: Blob
  thumb: Blob
}

/**
 * Contrato de almacenamiento. Hay dos implementaciones:
 * - Supabase (datos en la nube, sincroniza celular y compu)
 * - Local (IndexedDB), usada como modo demo cuando no hay credenciales.
 */
export interface DataStore {
  kind: 'supabase' | 'local'
  list(): Promise<GarmentWithImage[]>
  add(payload: NewGarmentPayload): Promise<GarmentWithImage>
  update(id: string, patch: Partial<GarmentInput>): Promise<void>
  remove(id: string): Promise<void>
}
