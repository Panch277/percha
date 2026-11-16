import { describe, expect, it } from 'vitest'
import { autoDescription } from './taxonomy.ts'

describe('descripción automática', () => {
  it('concuerda género y número en español', () => {
    expect(autoDescription('tshirt', 'black', 'es')).toBe('Remera negra')
    expect(autoDescription('sneakers', 'white', 'es')).toBe('Zapatillas blancas')
    expect(autoDescription('shoes', 'brown', 'es')).toBe('Zapatos marrones')
    expect(autoDescription('boots', 'gray', 'es')).toBe('Botas grises')
    expect(autoDescription('shirt', 'silver', 'es')).toBe('Camisa plateada')
    expect(autoDescription('hoodie', 'black', 'es')).toBe('Buzo negro')
  })
  it('deja invariables los colores compuestos o sustantivos', () => {
    expect(autoDescription('cap', 'navy', 'es')).toBe('Gorra azul marino')
    expect(autoDescription('sneakers', 'beige', 'es')).toBe('Zapatillas beige')
    expect(autoDescription('shirt', 'pink', 'es')).toBe('Camisa rosa')
  })
  it('jean azul, no "jean azul jean"', () => {
    expect(autoDescription('jeans', 'denim', 'es')).toBe('Jean azul')
    expect(autoDescription('jeans', 'denim', 'en')).toBe('Blue jeans')
  })
})
