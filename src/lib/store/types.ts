import type { Occasion, Prefs } from '../outfits/engine'
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
  /** estampado / gráfico grande (para no juntar dos en un outfit) */
  pattern: boolean
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

/** Outfit guardado. Las prendas se guardan como lista: el lugar en el collage sale de la categoría. */
export interface Outfit {
  id: string
  occasion: Occasion
  style: StyleKey
  itemIds: string[]
  /** día para el que se armó (YYYY-MM-DD), opcional */
  date: string | null
  /** render de prueba virtual (entrega 4) */
  tryonPath: string | null
  createdAt: string
}

export type OutfitInput = Pick<Outfit, 'occasion' | 'style' | 'itemIds' | 'date'>

export interface City {
  name: string
  lat: number
  lon: number
}

/** Preferencias del usuario: pesos de like/dislike y ciudad para el clima */
export interface UserPrefs {
  weights: Prefs
  city: City | null
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

  listOutfits(): Promise<Outfit[]>
  addOutfit(o: OutfitInput): Promise<Outfit>
  removeOutfit(id: string): Promise<void>

  getPrefs(): Promise<UserPrefs>
  savePrefs(p: UserPrefs): Promise<void>
}
