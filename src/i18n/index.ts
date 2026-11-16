import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const es = {
  nav: { closet: 'Clóset', outfits: 'Outfits', calendar: 'Calendario', profile: 'Perfil' },
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    next: 'Siguiente',
    skip: 'Descartar',
    retry: 'Reintentar',
    loading: 'Cargando…',
    all: 'Todo',
    unknownBrand: 'Sin marca',
    soon: 'Próximamente',
  },
  closet: {
    title: 'Mi clóset',
    count_one: '{{count}} prenda',
    count_other: '{{count}} prendas',
    search: 'Buscar marca, prenda o color',
    add: 'Agregar',
    emptyTitle: 'Tu clóset está vacío',
    emptyBody: 'Sacale una foto a cada prenda (sobre la cama o colgada alcanza). La app recorta el fondo y la etiqueta sola.',
    emptyCta: 'Agregar primeras prendas',
    noResults: 'Nada coincide con esos filtros.',
    clearFilters: 'Limpiar filtros',
    brand: 'Marca',
    color: 'Color',
    filters: 'Filtros',
    allBrands: 'Todas las marcas',
  },
  add: {
    title: 'Nuevas prendas',
    pick: 'Elegir fotos',
    pickHint: 'Podés elegir varias a la vez. Mejor con buena luz y la prenda entera a la vista.',
    processing: 'Procesando {{n}} de {{total}}',
    removingBg: 'Recortando fondo…',
    review: 'Revisá y guardá',
    reviewOf: '{{n}} de {{total}}',
    useCutout: 'Recortada',
    useOriginal: 'Original',
    bgFailed: 'No se pudo recortar el fondo. Se guarda la foto original.',
    tagFailed: 'No se pudieron sugerir etiquetas. Completalas a mano.',
    brandSuggested: 'Sugerida por IA',
    saveAll: 'Guardar todas ({{n}})',
    saving: 'Guardando…',
    done_one: '¡Listo! {{count}} prenda agregada.',
    done_other: '¡Listo! {{count}} prendas agregadas.',
    modelDownload: 'Descargando modelos de IA (solo la primera vez)',
    modelSeg: 'Recorte',
    modelClip: 'Etiquetas',
  },
  garment: {
    brand: 'Marca',
    description: 'Descripción',
    type: 'Tipo',
    colors: 'Colores',
    styles: 'Estilo',
    warmth: 'Abrigo',
    formality: 'Formalidad',
    warmthLevels: ['Liviano', 'Medio', 'Abrigado'],
    formalityLevels: ['Casual', 'Smart', 'Formal'],
    deleteConfirm: '¿Eliminar esta prenda? No se puede deshacer.',
  },
  outfits: {
    title: 'Outfits',
    body: 'Elegí una ocasión (oficina, salida, casual…) y la app arma combinaciones con tu ropa, según el clima del día.',
    stage: 'Llega en la entrega 2',
  },
  calendar: {
    title: 'Calendario',
    body: 'Asigná outfits a cada día del mes y miralos de un vistazo.',
    stage: 'Llega en la entrega 3',
  },
  profile: {
    title: 'Perfil',
    appearance: 'Apariencia',
    theme: 'Tema',
    themes: { system: 'Sistema', light: 'Claro', dark: 'Oscuro' },
    language: 'Idioma',
    account: 'Cuenta',
    signOut: 'Cerrar sesión',
    demo: 'Modo demo',
    demoBody: 'Sin Supabase configurado: los datos quedan solo en este navegador. Seguí la guía del README para activar la nube.',
    ai: 'Modelos de IA',
    aiBody: 'Se descargan una vez y quedan guardados en el navegador. Conviene hacerlo con wifi.',
    aiWarm: 'Precargar ahora',
    aiReady: 'Listos',
    avatar: 'Tu avatar',
    avatarBody: 'Foto de cuerpo completo para probarte los outfits. Llega en la entrega 4.',
  },
  auth: {
    tagline: 'Tu clóset, en tu bolsillo.',
    email: 'Email',
    password: 'Contraseña',
    signIn: 'Entrar',
    signUp: 'Crear cuenta',
    toSignUp: '¿Primera vez? Creá tu cuenta',
    toSignIn: 'Ya tengo cuenta',
    checkEmail: 'Te mandamos un mail para confirmar la cuenta. Después volvé y entrá.',
  },
}

type Dict = typeof es

const en: Dict = {
  nav: { closet: 'Closet', outfits: 'Outfits', calendar: 'Calendar', profile: 'Profile' },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    next: 'Next',
    skip: 'Discard',
    retry: 'Retry',
    loading: 'Loading…',
    all: 'All',
    unknownBrand: 'Unknown Brand',
    soon: 'Coming soon',
  },
  closet: {
    title: 'My closet',
    count_one: '{{count}} item',
    count_other: '{{count}} items',
    search: 'Search brand, item or color',
    add: 'Add',
    emptyTitle: 'Your closet is empty',
    emptyBody: 'Snap a photo of each piece (laid flat or on a hanger works). The app removes the background and tags it for you.',
    emptyCta: 'Add your first items',
    noResults: 'Nothing matches those filters.',
    clearFilters: 'Clear filters',
    brand: 'Brand',
    color: 'Color',
    filters: 'Filters',
    allBrands: 'All brands',
  },
  add: {
    title: 'New items',
    pick: 'Choose photos',
    pickHint: 'You can pick several at once. Good light and the whole item in frame work best.',
    processing: 'Processing {{n}} of {{total}}',
    removingBg: 'Removing background…',
    review: 'Review and save',
    reviewOf: '{{n}} of {{total}}',
    useCutout: 'Cutout',
    useOriginal: 'Original',
    bgFailed: "Couldn't remove the background. The original photo will be saved.",
    tagFailed: "Couldn't suggest tags. Fill them in manually.",
    brandSuggested: 'AI suggestion',
    saveAll: 'Save all ({{n}})',
    saving: 'Saving…',
    done_one: 'Done! {{count}} item added.',
    done_other: 'Done! {{count}} items added.',
    modelDownload: 'Downloading AI models (first time only)',
    modelSeg: 'Cutout',
    modelClip: 'Tags',
  },
  garment: {
    brand: 'Brand',
    description: 'Description',
    type: 'Type',
    colors: 'Colors',
    styles: 'Style',
    warmth: 'Warmth',
    formality: 'Formality',
    warmthLevels: ['Light', 'Medium', 'Warm'],
    formalityLevels: ['Casual', 'Smart', 'Formal'],
    deleteConfirm: "Delete this item? This can't be undone.",
  },
  outfits: {
    title: 'Outfits',
    body: 'Pick an occasion (office, night out, casual…) and the app builds combinations from your clothes, based on the weather.',
    stage: 'Arrives in delivery 2',
  },
  calendar: {
    title: 'Calendar',
    body: 'Assign outfits to each day of the month and see them at a glance.',
    stage: 'Arrives in delivery 3',
  },
  profile: {
    title: 'Profile',
    appearance: 'Appearance',
    theme: 'Theme',
    themes: { system: 'System', light: 'Light', dark: 'Dark' },
    language: 'Language',
    account: 'Account',
    signOut: 'Sign out',
    demo: 'Demo mode',
    demoBody: 'Supabase is not configured: data stays in this browser only. Follow the README to enable the cloud.',
    ai: 'AI models',
    aiBody: 'Downloaded once and cached in the browser. Best done on wifi.',
    aiWarm: 'Preload now',
    aiReady: 'Ready',
    avatar: 'Your avatar',
    avatarBody: 'A full-body photo to try outfits on. Arrives in delivery 4.',
  },
  auth: {
    tagline: 'Your closet, in your pocket.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    toSignUp: 'First time? Create your account',
    toSignIn: 'I already have an account',
    checkEmail: 'We sent you an email to confirm the account. Then come back and sign in.',
  },
}

const stored = (() => {
  try {
    return localStorage.getItem('percha.lang')
  } catch {
    return null
  }
})()
const initial = stored === 'en' || stored === 'es' ? stored : navigator.language.startsWith('en') ? 'en' : 'es'

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnObjects: true,
})

export function setLanguage(lang: 'es' | 'en') {
  i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  try {
    localStorage.setItem('percha.lang', lang)
  } catch {
    /* sin storage */
  }
}

export default i18n
