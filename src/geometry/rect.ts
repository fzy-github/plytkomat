import type { Rect } from '../model/types'

/**
 * Jedyna stała porównań współrzędnych w geometrii i obliczeniach (0.01 mm).
 * Nigdy nie porównujemy współrzędnych przez surowe ===.
 */
export const EPS = 1e-3

export const rectArea = (r: Rect): number => r.w * r.h

export function intersect(a: Rect, b: Rect): Rect | null {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  if (x2 - x1 <= EPS || y2 - y1 <= EPS) return null
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export function contains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.w <= outer.x + outer.w + EPS &&
    inner.y + inner.h <= outer.y + outer.h + EPS
  )
}

/** Przycina rect do granic (0,0,width,height); null, gdy nic nie zostaje. */
export function clampToBounds(r: Rect, width: number, height: number): Rect | null {
  return intersect(r, { x: 0, y: 0, w: width, h: height })
}

export interface CellDecomposition {
  covered: Rect[]
  uncovered: Rect[]
}

/**
 * Dekompozycja rect na komórki przez kompresję współrzędnych: krawędzie
 * wszystkich (przyciętych) dziur wyznaczają siatkę; każda komórka jest w
 * całości zakryta albo w całości wolna, więc nakładające się dziury nie
 * powodują podwójnego odejmowania.
 */
export function subtractToCells(rect: Rect, holes: Rect[]): CellDecomposition {
  const clipped = holes
    .map((h) => intersect(h, rect))
    .filter((h): h is Rect => h !== null)

  const uniqSorted = (values: number[]): number[] => {
    values.sort((a, b) => a - b)
    const out: number[] = []
    for (const v of values) {
      if (out.length === 0 || v - out[out.length - 1] > EPS) out.push(v)
    }
    return out
  }

  const xs = uniqSorted([
    rect.x,
    rect.x + rect.w,
    ...clipped.flatMap((h) => [h.x, h.x + h.w]),
  ])
  const ys = uniqSorted([
    rect.y,
    rect.y + rect.h,
    ...clipped.flatMap((h) => [h.y, h.y + h.h]),
  ])

  const covered: Rect[] = []
  const uncovered: Rect[] = []
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cell: Rect = { x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j] }
      if (cell.w <= EPS || cell.h <= EPS) continue
      const cx = cell.x + cell.w / 2
      const cy = cell.y + cell.h / 2
      const isCovered = clipped.some(
        (h) => cx > h.x && cx < h.x + h.w && cy > h.y && cy < h.y + h.h,
      )
      ;(isCovered ? covered : uncovered).push(cell)
    }
  }
  return { covered, uncovered }
}

/** Pole rect minus dziury (dziury mogą się nakładać i wystawać poza rect). */
export function areaMinusHoles(rect: Rect, holes: Rect[]): number {
  if (rect.w <= EPS || rect.h <= EPS) return 0
  return subtractToCells(rect, holes).uncovered.reduce((sum, c) => sum + rectArea(c), 0)
}
