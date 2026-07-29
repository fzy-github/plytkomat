import { describe, expect, it } from 'vitest'
import { areaMinusHoles, clampToBounds, contains, intersect, subtractToCells } from './rect'

describe('intersect / contains / clampToBounds', () => {
  it('przecięcie częściowe', () => {
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toEqual({
      x: 5,
      y: 5,
      w: 5,
      h: 5,
    })
  })

  it('brak przecięcia i styk krawędziami → null', () => {
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 })).toBeNull()
    expect(intersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBeNull()
  })

  it('contains z tolerancją EPS', () => {
    expect(contains({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(true)
    expect(contains({ x: 0, y: 0, w: 10, h: 10 }, { x: -1, y: 0, w: 5, h: 5 })).toBe(false)
  })

  it('clampToBounds przycina wystający rect', () => {
    expect(clampToBounds({ x: -5, y: 5, w: 20, h: 20 }, 10, 10)).toEqual({
      x: 0,
      y: 5,
      w: 10,
      h: 5,
    })
    expect(clampToBounds({ x: 20, y: 20, w: 5, h: 5 }, 10, 10)).toBeNull()
  })
})

describe('areaMinusHoles', () => {
  const rect = { x: 0, y: 0, w: 200, h: 100 }

  it('bez dziur — pełne pole', () => {
    expect(areaMinusHoles(rect, [])).toBe(20000)
  })

  it('jedna dziura w środku', () => {
    expect(areaMinusHoles(rect, [{ x: 70, y: 35, w: 60, h: 30 }])).toBe(20000 - 1800)
  })

  it('dwie nakładające się dziury — bez podwójnego odejmowania', () => {
    const holes = [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 50, y: 0, w: 100, h: 100 },
    ]
    // Suma pokrycia to 150×100, nie 200×100.
    expect(areaMinusHoles(rect, holes)).toBe(20000 - 15000)
  })

  it('dziura częściowo poza rectem — liczy się tylko część wewnątrz', () => {
    expect(areaMinusHoles(rect, [{ x: 150, y: 50, w: 100, h: 100 }])).toBe(20000 - 50 * 50)
  })

  it('dziura kryjąca wszystko → 0', () => {
    expect(areaMinusHoles(rect, [{ x: -10, y: -10, w: 500, h: 500 }])).toBe(0)
  })

  it('zdegenerowany rect → 0', () => {
    expect(areaMinusHoles({ x: 0, y: 0, w: 0, h: 100 }, [])).toBe(0)
  })
})

describe('subtractToCells', () => {
  it('klasyfikuje komórki i zachowuje sumę pól', () => {
    const rect = { x: 0, y: 0, w: 10, h: 10 }
    const { covered, uncovered } = subtractToCells(rect, [{ x: 2, y: 2, w: 4, h: 4 }])
    const area = (cells: { w: number; h: number }[]) =>
      cells.reduce((s, c) => s + c.w * c.h, 0)
    expect(area(covered)).toBe(16)
    expect(area(uncovered)).toBe(84)
  })
})
