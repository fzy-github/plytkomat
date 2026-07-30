import { EPS, intersect } from '../geometry/rect'
import type { Rect } from '../model/types'

export interface PanelLayoutInput {
  /** Region już przycięty do powierzchni; oś X = kierunek desek, oś Y = w poprzek rzędów. */
  width: number
  height: number
  /** Dziury we współrzędnych regionu (po ewentualnej transpozycji kierunku 'v'). */
  holes: Rect[]
  /** cm: length wzdłuż rzędu, width = wysokość rzędu. */
  panel: { length: number; width: number }
  /** Minimalna długość kawałka startującego rząd/segment. */
  minStart: number
  /** Minimalne przesunięcie styków między sąsiednimi rzędami. */
  minStagger: number
}

export interface PanelLayoutResult {
  /** Deski ułożone w całości (bez cięcia). */
  fullPlanks: number
  /** Kawałki wymagające cięcia (cały ostatni rząd rip też). */
  cutPieces: number
  /** Kawałki pokryte ścinką przeniesioną z końca rzędu/segmentu. */
  cutsServedByCarry: number
  /** Nowe deski zużyte na docinki. */
  newPlanksForCuts: number
  /** fullPlanks + newPlanksForCuts. */
  totalPlanks: number
  rows: number
  /** Rzędy, w których żaden kandydat startowy nie spełnił przewiązki. */
  staggerFallbackRows: number
}

const EMPTY: PanelLayoutResult = {
  fullPlanks: 0,
  cutPieces: 0,
  cutsServedByCarry: 0,
  newPlanksForCuts: 0,
  totalPlanks: 0,
  rows: 0,
  staggerFallbackRows: 0,
}

/** Cykliczny dystans faz styków w obrębie deski długości L. */
const cyclicDist = (a: number, b: number, length: number): number => {
  const d = Math.abs(a - b)
  return Math.min(d, length - d)
}

/**
 * Segmenty rzędu po odjęciu blokerów: rząd dzielą wyłącznie dziury kryjące
 * PEŁNĄ wysokość pasma. Dziura częściowej wysokości nie dzieli — deski
 * przechodzą i są wycinane (konserwatywnie, jak dziura w komórce płytki).
 * Udokumentowane ograniczenie: dwie dziury łącznie kryjące wysokość pasma
 * nie są wykrywane jako bloker — wynik lekko zawyżony, nigdy zaniżony.
 */
function rowSegments(width: number, band: Rect, holes: Rect[]): Array<[number, number]> {
  const blockers = holes
    .map((h) => intersect(h, band))
    .filter((h): h is Rect => h !== null && h.h >= band.h - EPS)
    .map((h) => [h.x, h.x + h.w] as [number, number])
    .sort((a, b) => a[0] - b[0])
  const segments: Array<[number, number]> = []
  let cursor = 0
  for (const [bx1, bx2] of blockers) {
    if (bx1 - cursor > EPS) segments.push([cursor, bx1])
    cursor = Math.max(cursor, bx2)
  }
  if (width - cursor > EPS) segments.push([cursor, width])
  return segments
}

/**
 * Symulacja klasycznego układania paneli — SZACUNEK, nie plan cięcia. Założenia:
 *
 * 1. Bez fugi (panele click). Dylatacja (szczelina przy ścianach) poza
 *    zakresem — użytkownik może zmniejszyć region o ~1 cm z każdej strony.
 * 2. Rzędy wzdłuż Y o skoku = szerokość deski, od y=0. Ostatni rząd przycięty
 *    (height % szer. ≠ 0) to rząd RIPOWANY: każdy kawałek — nawet pełnej
 *    długości — jest cięty wzdłuż i liczy się jako docinka z nowej deski;
 *    pasek z ripa nie wraca do użycia.
 * 3. Dziury dzielą rząd na segmenty wg rowSegments (blokery pełnej wysokości).
 * 4. JEDEN slot przeniesienia: w ręce jest tylko ścinka z ostatniego cięcia
 *    kończącego segment. Kawałek startowy skrócony wyłącznie dla przewiązki
 *    ma resztkę ODRZUCANĄ (przenosi się tylko końcówki rzędów). Odrzucone
 *    przeniesienie czeka aż zostanie nadpisane.
 * 5. Uproszczona przewiązka: wszystkie środkowe deski mają pełną długość L,
 *    więc wzór styków segmentu wyznacza faza (start + pierwszy kawałek) mod L.
 *    Reguła: faza pierwszego wewnętrznego styku segmentu musi mieć cykliczny
 *    dystans ≥ minStagger od fazy PIERWSZEGO wewnętrznego styku poprzedniego
 *    rzędu. Jedna faza na rząd; rząd bez styków zeruje odniesienie.
 *    Kandydaci świeżej deski: [L, L/2, L/3, 2L/3] ≥ minStart; brak kandydata →
 *    fallback (pełna deska) + licznik staggerFallbackRows.
 * 6. minOffcut (płytki) nie dotyczy paneli — o użyteczności przeniesienia
 *    decyduje wyłącznie minStart.
 */
export function simulatePanelRegion(input: PanelLayoutInput): PanelLayoutResult {
  const { width, height, holes, panel, minStart, minStagger } = input
  const L = panel.length
  const W = panel.width
  if (width <= EPS || height <= EPS || L <= EPS || W <= EPS) return { ...EMPTY }

  const result: PanelLayoutResult = { ...EMPTY }
  let carry = 0
  let prevPhase: number | null = null

  for (let j = 0; j * W < height - EPS; j++) {
    const rowY = j * W
    const rowH = Math.min(W, height - rowY)
    const isRip = rowH < W - EPS
    const band: Rect = { x: 0, y: rowY, w: width, h: rowH }
    const segments = rowSegments(width, band, holes)
    let thisPhase: number | null = null
    let rowFellBack = false

    for (const [s, e] of segments) {
      const len = e - s

      // --- pierwszy kawałek segmentu ---
      let first: number | null = null
      let fromCarry = false
      if (carry >= minStart - EPS) {
        const cand = Math.min(carry, len)
        const jointOk =
          cand >= len - EPS ||
          prevPhase === null ||
          cyclicDist((s + cand) % L, prevPhase, L) >= minStagger - EPS
        if (jointOk) {
          first = cand
          fromCarry = true
        }
      }
      if (first === null) {
        for (const c of [L, L / 2, L / 3, (2 * L) / 3]) {
          if (c < minStart - EPS) continue
          const eff = Math.min(c, len)
          const jointOk =
            eff >= len - EPS ||
            prevPhase === null ||
            cyclicDist((s + eff) % L, prevPhase, L) >= minStagger - EPS
          if (jointOk) {
            first = eff
            break
          }
        }
      }
      if (first === null) {
        first = Math.min(L, len)
        if (!rowFellBack) {
          result.staggerFallbackRows++
          rowFellBack = true
        }
      }

      if (fromCarry) {
        result.cutPieces++
        result.cutsServedByCarry++
        carry -= first
      } else if (first >= L - EPS && !isRip) {
        result.fullPlanks++
      } else {
        result.cutPieces++
        result.newPlanksForCuts++
        // Końcówka segmentu przenosi się; kawałek skrócony dla przewiązki — nie.
        if (s + first >= e - EPS) carry = L - first
      }
      if (thisPhase === null && first < len - EPS) thisPhase = (s + first) % L

      // --- pełne deski w środku ---
      let p = s + first
      while (e - p >= L - EPS) {
        if (isRip) {
          result.cutPieces++
          result.newPlanksForCuts++
        } else {
          result.fullPlanks++
        }
        p += L
      }

      // --- końcowa docinka ---
      const rem = e - p
      if (rem > EPS) {
        result.cutPieces++
        result.newPlanksForCuts++
        carry = L - rem
      }
    }

    prevPhase = thisPhase
    result.rows++
  }

  result.totalPlanks = result.fullPlanks + result.newPlanksForCuts
  return result
}
