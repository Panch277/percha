/**
 * Taxonomía de prendas. Es la base del auto-etiquetado (prompts para CLIP) y,
 * más adelante, del generador de outfits (abrigo y formalidad por defecto).
 */

export type Lang = 'es' | 'en'
type L = Record<Lang, string>

export type CategoryKey = 'top' | 'outerwear' | 'bottom' | 'footwear' | 'headwear' | 'eyewear' | 'accessory'

export const CATEGORIES: { key: CategoryKey; label: L }[] = [
  { key: 'top', label: { es: 'Arriba', en: 'Tops' } },
  { key: 'outerwear', label: { es: 'Abrigos', en: 'Outerwear' } },
  { key: 'bottom', label: { es: 'Abajo', en: 'Bottoms' } },
  { key: 'footwear', label: { es: 'Calzado', en: 'Footwear' } },
  { key: 'headwear', label: { es: 'Gorras', en: 'Headwear' } },
  { key: 'eyewear', label: { es: 'Lentes', en: 'Eyewear' } },
  { key: 'accessory', label: { es: 'Accesorios', en: 'Accessories' } },
]

export interface SubcategoryDef {
  key: string
  category: CategoryKey
  label: L
  /** Texto para CLIP (en inglés funciona mejor) */
  prompt: string
  /** 1 = liviano, 2 = medio, 3 = abrigado */
  warmth: 1 | 2 | 3
  /** 1 = deportivo/casual, 2 = smart casual, 3 = formal/oficina */
  formality: 1 | 2 | 3
}

export const SUBCATEGORIES: SubcategoryDef[] = [
  // Prompts descriptivos: con "a t-shirt" a secas CLIP confundía remeras con logo bordado con chombas
  { key: 'tshirt', category: 'top', label: { es: 'Remera', en: 'T-shirt' }, prompt: 'a crew neck t-shirt with short sleeves', warmth: 1, formality: 1 },
  { key: 'tank', category: 'top', label: { es: 'Musculosa', en: 'Tank top' }, prompt: 'a sleeveless tank top', warmth: 1, formality: 1 },
  { key: 'polo', category: 'top', label: { es: 'Chomba', en: 'Polo' }, prompt: 'a polo shirt with a folded collar and buttons', warmth: 1, formality: 2 },
  { key: 'shirt', category: 'top', label: { es: 'Camisa', en: 'Shirt' }, prompt: 'a button-up shirt with a collar', warmth: 1, formality: 3 },
  { key: 'knit', category: 'top', label: { es: 'Sweater', en: 'Sweater' }, prompt: 'a knit sweater', warmth: 2, formality: 2 },
  { key: 'hoodie', category: 'top', label: { es: 'Buzo', en: 'Hoodie' }, prompt: 'a hoodie or sweatshirt', warmth: 2, formality: 1 },
  { key: 'jacket', category: 'outerwear', label: { es: 'Campera', en: 'Jacket' }, prompt: 'a jacket', warmth: 2, formality: 2 },
  { key: 'puffer', category: 'outerwear', label: { es: 'Campera inflable', en: 'Puffer jacket' }, prompt: 'a puffer jacket', warmth: 3, formality: 1 },
  { key: 'coat', category: 'outerwear', label: { es: 'Tapado', en: 'Coat' }, prompt: 'a long coat', warmth: 3, formality: 3 },
  { key: 'blazer', category: 'outerwear', label: { es: 'Saco', en: 'Blazer' }, prompt: 'a blazer', warmth: 2, formality: 3 },
  { key: 'jeans', category: 'bottom', label: { es: 'Jean', en: 'Jeans' }, prompt: 'a pair of denim jeans', warmth: 2, formality: 2 },
  { key: 'pants', category: 'bottom', label: { es: 'Pantalón', en: 'Trousers' }, prompt: 'a pair of trousers', warmth: 2, formality: 3 },
  { key: 'joggers', category: 'bottom', label: { es: 'Jogging', en: 'Joggers' }, prompt: 'a pair of sweatpants', warmth: 2, formality: 1 },
  { key: 'shorts', category: 'bottom', label: { es: 'Short', en: 'Shorts' }, prompt: 'a pair of shorts', warmth: 1, formality: 1 },
  { key: 'sneakers', category: 'footwear', label: { es: 'Zapatillas', en: 'Sneakers' }, prompt: 'a pair of sneakers', warmth: 2, formality: 1 },
  { key: 'shoes', category: 'footwear', label: { es: 'Zapatos', en: 'Dress shoes' }, prompt: 'a pair of leather dress shoes', warmth: 2, formality: 3 },
  { key: 'boots', category: 'footwear', label: { es: 'Botas', en: 'Boots' }, prompt: 'a pair of boots', warmth: 3, formality: 2 },
  { key: 'sandals', category: 'footwear', label: { es: 'Sandalias', en: 'Sandals' }, prompt: 'a pair of sandals or slides', warmth: 1, formality: 1 },
  { key: 'cap', category: 'headwear', label: { es: 'Gorra', en: 'Cap' }, prompt: 'a baseball cap', warmth: 1, formality: 1 },
  { key: 'beanie', category: 'headwear', label: { es: 'Gorro', en: 'Beanie' }, prompt: 'a knit beanie', warmth: 3, formality: 1 },
  { key: 'sunglasses', category: 'eyewear', label: { es: 'Anteojos de sol', en: 'Sunglasses' }, prompt: 'a pair of sunglasses', warmth: 1, formality: 2 },
  { key: 'watch', category: 'accessory', label: { es: 'Reloj', en: 'Watch' }, prompt: 'a wrist watch', warmth: 2, formality: 2 },
  { key: 'bag', category: 'accessory', label: { es: 'Bolso', en: 'Bag' }, prompt: 'a bag or backpack', warmth: 2, formality: 2 },
  { key: 'belt', category: 'accessory', label: { es: 'Cinturón', en: 'Belt' }, prompt: 'a leather belt', warmth: 2, formality: 3 },
  { key: 'socks', category: 'accessory', label: { es: 'Medias', en: 'Socks' }, prompt: 'a pair of socks', warmth: 2, formality: 1 },
]

export const SUB_BY_KEY = Object.fromEntries(SUBCATEGORIES.map((s) => [s.key, s])) as Record<string, SubcategoryDef>

export type StyleKey = 'casual' | 'street' | 'athleisure' | 'smart' | 'formal' | 'minimal'
export const STYLES: { key: StyleKey; label: L; prompt: string }[] = [
  { key: 'casual', label: { es: 'Casual', en: 'Casual' }, prompt: 'casual everyday clothing' },
  { key: 'street', label: { es: 'Streetwear', en: 'Streetwear' }, prompt: 'streetwear clothing' },
  { key: 'athleisure', label: { es: 'Athleisure', en: 'Athleisure' }, prompt: 'sporty athletic clothing' },
  { key: 'smart', label: { es: 'Smart casual', en: 'Smart casual' }, prompt: 'smart casual clothing' },
  { key: 'formal', label: { es: 'Formal', en: 'Formal' }, prompt: 'formal elegant clothing' },
  { key: 'minimal', label: { es: 'Minimalista', en: 'Minimal' }, prompt: 'plain minimalist clothing' },
]

/** Paleta con nombre: el color dominante de cada prenda se asigna al más cercano. */
export interface NamedColor {
  key: string
  hex: string
  label: L
  /** Nombre en inglés para el prompt de CLIP */
  clip: string
  neutral?: boolean
}
export const COLORS: NamedColor[] = [
  { key: 'black', hex: '#111111', label: { es: 'Negro', en: 'Black' }, clip: 'black', neutral: true },
  { key: 'white', hex: '#FAFAFA', label: { es: 'Blanco', en: 'White' }, clip: 'white', neutral: true },
  { key: 'gray', hex: '#9A9A9E', label: { es: 'Gris', en: 'Gray' }, clip: 'light gray', neutral: true },
  { key: 'charcoal', hex: '#45474B', label: { es: 'Gris oscuro', en: 'Charcoal' }, clip: 'dark gray', neutral: true },
  { key: 'cream', hex: '#EEE6D3', label: { es: 'Crema', en: 'Cream' }, clip: 'cream', neutral: true },
  { key: 'beige', hex: '#CDB892', label: { es: 'Beige', en: 'Beige' }, clip: 'beige', neutral: true },
  { key: 'brown', hex: '#6B4A32', label: { es: 'Marrón', en: 'Brown' }, clip: 'brown', neutral: true },
  { key: 'navy', hex: '#1F2A44', label: { es: 'Azul marino', en: 'Navy' }, clip: 'navy blue', neutral: true },
  { key: 'blue', hex: '#2F5DA8', label: { es: 'Azul', en: 'Blue' }, clip: 'royal blue' },
  { key: 'denim', hex: '#5878A0', label: { es: 'Azul jean', en: 'Denim blue' }, clip: 'denim blue' },
  { key: 'lightblue', hex: '#9CC3E6', label: { es: 'Celeste', en: 'Light blue' }, clip: 'light blue' },
  { key: 'green', hex: '#2F7D4A', label: { es: 'Verde', en: 'Green' }, clip: 'green' },
  { key: 'olive', hex: '#5E6B3A', label: { es: 'Verde oliva', en: 'Olive' }, clip: 'olive green' },
  { key: 'red', hex: '#C42B2B', label: { es: 'Rojo', en: 'Red' }, clip: 'red' },
  { key: 'burgundy', hex: '#6E1F2D', label: { es: 'Bordó', en: 'Burgundy' }, clip: 'burgundy' },
  { key: 'pink', hex: '#E9A3B5', label: { es: 'Rosa', en: 'Pink' }, clip: 'pink' },
  { key: 'orange', hex: '#E07A2E', label: { es: 'Naranja', en: 'Orange' }, clip: 'orange' },
  { key: 'yellow', hex: '#E8C547', label: { es: 'Amarillo', en: 'Yellow' }, clip: 'yellow' },
  { key: 'purple', hex: '#6A4C93', label: { es: 'Violeta', en: 'Purple' }, clip: 'purple' },
  { key: 'silver', hex: '#C9CCD1', label: { es: 'Plateado', en: 'Silver' }, clip: 'silver', neutral: true },
]
export const COLOR_BY_KEY = Object.fromEntries(COLORS.map((c) => [c.key, c])) as Record<string, NamedColor>

/** Marcas que CLIP intenta reconocer por logo. Es una sugerencia: siempre se puede corregir. */
export const KNOWN_BRANDS = [
  'Nike',
  'Adidas',
  'Jordan',
  'New Era',
  'Puma',
  'Converse',
  'Vans',
  'New Balance',
  'Asics',
  'The North Face',
  'Polo Ralph Lauren',
  'Lacoste',
  "Levi's",
  'Tommy Hilfiger',
  'Topper',
  'Zara',
  'Under Armour',
  'Champion',
]

export function subLabel(key: string, lang: Lang) {
  return SUB_BY_KEY[key]?.label[lang] ?? key
}
export function colorLabel(key: string, lang: Lang) {
  return COLOR_BY_KEY[key]?.label[lang] ?? key
}

/** Género y número del nombre en español (m singular si no figura): "Remera negra", "Zapatillas blancas" */
const ES_FORM: Record<string, 'f' | 'mp' | 'fp'> = {
  tshirt: 'f',
  tank: 'f',
  polo: 'f',
  shirt: 'f',
  jacket: 'f',
  puffer: 'f',
  cap: 'f',
  sneakers: 'fp',
  shoes: 'mp',
  boots: 'fp',
  sandals: 'fp',
  sunglasses: 'mp',
  socks: 'fp',
}

/** Colores que no cambian con el género ni el número ("azul marino", "beige", "rosa"…) */
const ES_INVARIABLE = new Set(['charcoal', 'cream', 'beige', 'navy', 'denim', 'olive', 'burgundy', 'pink', 'orange', 'purple'])

/** Color en español concordado con la prenda: negro → negra / negros / negras; gris → grises */
export function esColor(colorKey: string, sub: string) {
  let c = colorLabel(colorKey, 'es').toLowerCase()
  if (ES_INVARIABLE.has(colorKey)) return c
  const form = ES_FORM[sub] ?? 'm'
  if (form.startsWith('f') && c.endsWith('o')) c = c.slice(0, -1) + 'a'
  if (form.endsWith('p')) c = /[aeiou]$/.test(c) ? c + 's' : c === 'marrón' ? 'marrones' : c + 'es'
  return c
}

/** Descripción corta automática: "Gorra azul marino" / "Navy cap" */
export function autoDescription(sub: string, colorKey: string | undefined, lang: Lang) {
  const s = subLabel(sub, lang)
  if (!colorKey) return s
  // "Jean azul jean" suena mal: para prendas de jean el color denim se nombra como azul
  const key = colorKey === 'denim' && sub === 'jeans' ? 'blue' : colorKey
  return lang === 'es' ? `${s} ${esColor(key, sub)}` : `${colorLabel(key, lang)} ${s.toLowerCase()}`
}
