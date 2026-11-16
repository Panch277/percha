import { describe, expect, it } from 'vitest'
import emb from './clip-text-embeddings.json'
import { allPrompts, CLIP_MODEL } from './prompts.ts'

describe('embeddings de texto de CLIP', () => {
  it('están al día con los prompts (si falla: npm run clip:embed)', () => {
    expect(emb.model).toBe(CLIP_MODEL)
    const have = new Set(emb.prompts)
    expect(allPrompts().filter((p) => !have.has(p))).toEqual([])
  })
})
