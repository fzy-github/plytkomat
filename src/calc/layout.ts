import { EPS, intersect, rectArea, subtractToCells } from '../geometry/rect'
import type { Rect } from '../model/types'

export interface LayoutInput {
  /** Wymiary regionu (już przyciętego do powierzchni), cm. */
  width: number
  height: number
  /** Dziury we współrzędnych regionu (mogą się nakładać i wystawać). */
  holes: Rect[]
  tile: { width: number; height: number; rotatable: boolean }
  /** Szerokość fugi, cm. */
  grout: number
  /** Najmniejszy wymiar ścinki nadającej się do ponownego użycia, cm. */
  minOffcut: number
  /** Tylko 'grid' w v1; układy z przesunięciem (cegła) to przyszła wartość. */
  pattern: 'grid'
}

export interface LayoutResult {
  fullTiles: number
  cutCells: number
  cutsServedByOffcuts: number
  newTilesForCuts: number
  /** fullTiles + newTilesForCuts. */
  totalTiles: number
}

interface Piece {
  w: number
  h: number
}

const EMPTY: LayoutResult = {
  fullTiles: 0,
  cutCells: 0,
  cutsServedByOffcuts: 0,
  newTilesForCuts: 0,
  totalTiles: 0,
}

/**
 * Symulacja prostego układu siatki — SZACUNEK, nie plan cięcia. Założenia:
 *
 * 1. Siatka startuje w narożniku (0,0) regionu; skok = płytka + fuga.
 *    Komórka (i,j) zajmuje [i·pitch, i·pitch + płytka], przycięta do regionu.
 * 2. Komórka w całości zakryta dziurami → bez płytki. Pełna płytka bez dziur
 *    → pełna. Inaczej → docinka o zapotrzebowaniu = PROSTOKĄTNY BOUNDING BOX
 *    widocznej części (dziura w środku płytki nadal zużywa całą płytkę i nie
 *    daje ścinki — poprawne dla przejść rur; L-kształt przy narożniku wnęki
 *    jest liczony lekko pesymistycznie).
 * 3. Ponowne użycie ścinek: zachłanny first-fit W OBRĘBIE REGIONU, popyt
 *    malejąco po polu. Dopasowanie z rotacją 90°, jeśli płytka `rotatable`.
 *    Cięcie gilotynowe zapotrzebowania nw×nh z kawałka pw×ph zostawia
 *    (pw−nw)×ph oraz nw×(ph−nh); do kosza trafiają resztki o OBU wymiarach
 *    ≥ minOffcut. Deterministyczne; nigdy nie zaniża liczby płytek przy
 *    tych regułach cięcia.
 */
export function simulateRegion(input: LayoutInput): LayoutResult {
  const { width, height, holes, tile, grout, minOffcut } = input
  if (width <= EPS || height <= EPS || tile.width <= EPS || tile.height <= EPS) {
    return { ...EMPTY }
  }

  const result: LayoutResult = { ...EMPTY }
  const bounds: Rect = { x: 0, y: 0, w: width, h: height }
  const pitchX = tile.width + grout
  const pitchY = tile.height + grout
  const tileArea = tile.width * tile.height
  const demands: Piece[] = []

  for (let i = 0; i * pitchX < width - EPS; i++) {
    for (let j = 0; j * pitchY < height - EPS; j++) {
      const cell = intersect(
        { x: i * pitchX, y: j * pitchY, w: tile.width, h: tile.height },
        bounds,
      )
      if (!cell) continue
      const uncovered = subtractToCells(cell, holes).uncovered
      if (uncovered.length === 0) continue
      const visibleArea = uncovered.reduce((s, c) => s + rectArea(c), 0)
      const isFull =
        Math.abs(cell.w - tile.width) < EPS &&
        Math.abs(cell.h - tile.height) < EPS &&
        Math.abs(visibleArea - tileArea) < EPS
      if (isFull) {
        result.fullTiles++
        continue
      }
      result.cutCells++
      demands.push(boundingBox(uncovered))
    }
  }

  // Kosz ścinek: popyt malejąco po polu (sort stabilny → deterministycznie).
  demands.sort((a, b) => b.w * b.h - a.w * a.h)
  const bin: Piece[] = []
  for (const d of demands) {
    const idx = bin.findIndex((p) => fitsDirect(p, d) || fitsRotated(p, d, tile.rotatable))
    if (idx >= 0) {
      const piece = bin.splice(idx, 1)[0]
      const cut = fitsDirect(piece, d) ? d : { w: d.h, h: d.w }
      pushRemainders(bin, piece, cut, minOffcut)
      result.cutsServedByOffcuts++
    } else {
      result.newTilesForCuts++
      pushRemainders(bin, { w: tile.width, h: tile.height }, d, minOffcut)
    }
  }

  result.totalTiles = result.fullTiles + result.newTilesForCuts
  return result
}

const fitsDirect = (p: Piece, d: Piece): boolean => p.w >= d.w - EPS && p.h >= d.h - EPS

const fitsRotated = (p: Piece, d: Piece, rotatable: boolean): boolean =>
  rotatable && p.w >= d.h - EPS && p.h >= d.w - EPS

function boundingBox(rects: Rect[]): Piece {
  let x1 = Number.POSITIVE_INFINITY
  let y1 = Number.POSITIVE_INFINITY
  let x2 = Number.NEGATIVE_INFINITY
  let y2 = Number.NEGATIVE_INFINITY
  for (const r of rects) {
    x1 = Math.min(x1, r.x)
    y1 = Math.min(y1, r.y)
    x2 = Math.max(x2, r.x + r.w)
    y2 = Math.max(y2, r.y + r.h)
  }
  return { w: x2 - x1, h: y2 - y1 }
}

/** Dwa cięcia gilotynowe: resztki (pw−nw)×ph i nw×(ph−nh). */
function pushRemainders(bin: Piece[], piece: Piece, cut: Piece, minOffcut: number): void {
  const r1: Piece = { w: piece.w - cut.w, h: piece.h }
  const r2: Piece = { w: cut.w, h: piece.h - cut.h }
  for (const r of [r1, r2]) {
    if (r.w >= minOffcut - EPS && r.h >= minOffcut - EPS) bin.push(r)
  }
}
