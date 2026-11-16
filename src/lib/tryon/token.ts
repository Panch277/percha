/**
 * Token de Hugging Face opcional para la prueba virtual. Sin token, ZeroGPU da una cuota diaria
 * muy chica por IP (cada prueba pide 90 s de GPU por paso); con el token de una cuenta gratis
 * hay más. Lo pega el usuario en Perfil y queda SOLO en este dispositivo (localStorage), no se
 * sube a Supabase. Alcanza con un token de lectura ("Read").
 */
const KEY = 'percha.hfToken'
const listeners = new Set<() => void>()

export function getHfToken(): `hf_${string}` | null {
  try {
    const v = localStorage.getItem(KEY)
    return v && v.startsWith('hf_') ? (v as `hf_${string}`) : null
  } catch {
    return null
  }
}

export function setHfToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token.trim())
    else localStorage.removeItem(KEY)
  } catch {
    /* sin storage */
  }
  listeners.forEach((l) => l())
}

/** Para reconectar el cliente de Gradio cuando cambia el token */
export function onHfTokenChange(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
