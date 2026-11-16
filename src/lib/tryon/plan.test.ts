import { describe, expect, it } from 'vitest'
import { classifyError, tryOnParts } from './plan.ts'

describe('prendas a probar', () => {
  it('arriba va el abrigo si hay; si no, el top', () => {
    expect(tryOnParts({ top: 't', bottom: 'b', outerwear: 'o' })).toEqual({ upper: 'o', lower: 'b' })
    expect(tryOnParts({ top: 't', bottom: 'b', footwear: 'f', headwear: 'h' })).toEqual({ upper: 't', lower: 'b' })
  })
  it('sin arriba o sin abajo devuelve null en ese lugar', () => {
    expect(tryOnParts({ bottom: 'b' })).toEqual({ upper: null, lower: 'b' })
    expect(tryOnParts({ footwear: 'f' })).toEqual({ upper: null, lower: null })
  })
})

describe('errores del Space', () => {
  it('cuota de ZeroGPU', () => {
    expect(classifyError('You have exceeded your GPU quota (60s requested vs. 12s left)')).toBe('quota')
    expect(classifyError('You have exceeded your free GPU quota. Try again in 5:00')).toBe('quota')
  })
  it('Space dormido o caído', () => {
    expect(classifyError('Space is sleeping')).toBe('unavailable')
    expect(classifyError('Could not resolve app config')).toBe('unavailable')
    expect(classifyError('Failed to fetch')).toBe('unavailable')
  })
  it('timeout y genéricos', () => {
    expect(classifyError('Request timed out')).toBe('timeout')
    expect(classifyError('CUDA out of memory')).toBe('failed')
  })
})
