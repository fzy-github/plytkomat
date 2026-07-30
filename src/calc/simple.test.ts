import { describe, expect, it } from 'vitest'
import { simpleTileCount } from './simple'

describe('simpleTileCount', () => {
  const tile = { width: 60, height: 30 }

  it('region 200×100, płytka 60×30, zapas 10% → 13 sztuk', () => {
    // 20000 cm² · 1.1 = 22000; 22000 / 1800 = 12.22 → 13
    expect(simpleTileCount(200 * 100, tile, 10)).toBe(13)
  })

  it('zapas 0 → 12 sztuk (dokładnie 20000/1800 = 11.11 → 12)', () => {
    expect(simpleTileCount(200 * 100, tile, 0)).toBe(12)
  })

  it('pole zero lub ujemne → 0 sztuk', () => {
    expect(simpleTileCount(0, tile, 10)).toBe(0)
    expect(simpleTileCount(-5, tile, 10)).toBe(0)
  })
})
