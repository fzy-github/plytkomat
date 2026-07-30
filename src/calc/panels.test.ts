import { describe, expect, it } from 'vitest'
import { simulatePanelRegion, type PanelLayoutInput } from './panels'

// Panel 130×20, minStart 30, minStagger 30 — wszystkie wartości oczekiwane
// prześledzone ręcznie przez algorytm (fazy styków w komentarzach).
const base = (over: Partial<PanelLayoutInput>): PanelLayoutInput => ({
  width: 300,
  height: 60,
  holes: [],
  panel: { length: 130, width: 20 },
  minStart: 30,
  minStagger: 30,
  ...over,
})

describe('simulatePanelRegion — przypadki kanoniczne', () => {
  it('T1: 400×100 — przewiązka odrzuca przeniesienie (fazy 0/65 naprzemiennie)', () => {
    // Rząd 0: 3 pełne + docinka 10 (carry 120, faza 0).
    // Rząd 1: carry 120 → faza 120, dist 10 < 30 ODRZUT; świeża 130 → faza 0
    //   odrzut; 65 → OK (resztka odrzucona): 2 pełne + docinka 75 (carry 55).
    // Rząd 2: carry 55 → faza 55 vs 65: dist 10 odrzut; świeża 130 OK → jak rząd 0.
    // Rzędy 3, 4 powtarzają wzory 1, 0.
    const r = simulatePanelRegion(base({ width: 400, height: 100 }))
    expect(r.rows).toBe(5)
    expect(r.fullPlanks).toBe(13)
    expect(r.cutPieces).toBe(7)
    expect(r.cutsServedByCarry).toBe(0)
    expect(r.newPlanksForCuts).toBe(7)
    expect(r.totalPlanks).toBe(20)
    expect(r.staggerFallbackRows).toBe(0)
  })

  it('T2: 300×60 — przeniesienia akceptowane (fazy 0/90/50)', () => {
    // Rząd 0: 2 pełne + docinka 40 → carry 90. Rząd 1: carry 90 (dist 40 OK)
    // → served; 1 pełna; docinka 80 → carry 50. Rząd 2: carry 50 (dist 40 OK)
    // → served; 1 pełna; docinka 120.
    const r = simulatePanelRegion(base({}))
    expect(r.fullPlanks).toBe(4)
    expect(r.cutPieces).toBe(5)
    expect(r.cutsServedByCarry).toBe(2)
    expect(r.newPlanksForCuts).toBe(3)
    expect(r.totalPlanks).toBe(7)
  })

  it('T3: 240×40 — carry 20 < minStart odrzucone', () => {
    const r = simulatePanelRegion(base({ width: 240, height: 40 }))
    expect(r.fullPlanks).toBe(2)
    expect(r.cutPieces).toBe(3)
    expect(r.cutsServedByCarry).toBe(0)
    expect(r.newPlanksForCuts).toBe(3)
    expect(r.totalPlanks).toBe(5)
  })
})

describe('simulatePanelRegion — dziury i segmenty', () => {
  it('T4: dziura pełnej wysokości dzieli rzędy na segmenty', () => {
    // Dziura {100,0,100,40} blokuje rzędy 0 i 1 (segmenty [0,100]+[200,300]),
    // rząd 2 pełny. Ręcznie: full 1, cut 9, served 4, new 5, total 6.
    const r = simulatePanelRegion(base({ holes: [{ x: 100, y: 0, w: 100, h: 40 }] }))
    expect(r.rows).toBe(3)
    expect(r.fullPlanks).toBe(1)
    expect(r.cutPieces).toBe(9)
    expect(r.cutsServedByCarry).toBe(4)
    expect(r.newPlanksForCuts).toBe(5)
    expect(r.totalPlanks).toBe(6)
  })

  it('T7: dziura częściowej wysokości nie dzieli rzędu (deski przechodzą)', () => {
    const withHole = simulatePanelRegion(
      base({ height: 20, holes: [{ x: 100, y: 0, w: 50, h: 10 }] }),
    )
    const without = simulatePanelRegion(base({ height: 20 }))
    expect(withHole).toEqual(without)
    expect(withHole.totalPlanks).toBe(3)
  })

  it('T8b: rząd w całości zablokowany nie liczy desek, carry przeżywa do następnego', () => {
    // 200×60, dziura blokuje środkowy rząd (y 20..40) na całej szerokości.
    // Rząd 0: pełna + docinka 70 → carry 60, faza 0. Rząd 1: nic (prevPhase
    // się zeruje). Rząd 2: carry 60 → served; pełna; docinka 10.
    const r = simulatePanelRegion(
      base({ width: 200, holes: [{ x: 0, y: 20, w: 200, h: 20 }] }),
    )
    expect(r.rows).toBe(3)
    expect(r.fullPlanks).toBe(2)
    expect(r.cutPieces).toBe(3)
    expect(r.cutsServedByCarry).toBe(1)
    expect(r.newPlanksForCuts).toBe(2)
    expect(r.totalPlanks).toBe(4)
  })
})

describe('simulatePanelRegion — rip i krawędzie', () => {
  it('T5: ostatni rząd ripowany — każdy kawałek z nowej deski', () => {
    // 300×50: rzędy 20/20/10. Rzędy 0-1 jak T2; rząd 2 (rip): carry 50 served,
    // pełna długość → cut+new, docinka 120 → cut+new.
    const r = simulatePanelRegion(base({ height: 50 }))
    expect(r.rows).toBe(3)
    expect(r.fullPlanks).toBe(3)
    expect(r.cutPieces).toBe(6)
    expect(r.cutsServedByCarry).toBe(2)
    expect(r.newPlanksForCuts).toBe(4)
    expect(r.totalPlanks).toBe(7)
  })

  it('T6: minStagger > L/2 — fallback z licznikiem, wynik deterministyczny', () => {
    // Cykliczny dystans faz ≤ L/2 = 65 < 70, więc po ustaleniu fazy rzędu 0
    // żaden kandydat nie przechodzi → pełna deska awaryjnie.
    const r = simulatePanelRegion(base({ height: 40, minStagger: 70 }))
    expect(r.staggerFallbackRows).toBeGreaterThanOrEqual(1)
    expect(r.fullPlanks).toBe(4)
    expect(r.cutPieces).toBe(2)
    expect(r.newPlanksForCuts).toBe(2)
    expect(r.totalPlanks).toBe(6)
  })

  it('T8a: zdegenerowane wymiary → zera', () => {
    expect(simulatePanelRegion(base({ width: 0 })).totalPlanks).toBe(0)
    expect(simulatePanelRegion(base({ height: 0 })).totalPlanks).toBe(0)
  })

  it('deska dłuższa niż region → jedna docinka', () => {
    const r = simulatePanelRegion(base({ width: 100, height: 15 }))
    expect(r.fullPlanks).toBe(0)
    expect(r.cutPieces).toBe(1)
    expect(r.totalPlanks).toBe(1)
  })

  it('dokładne dopasowanie długości (260 = 2×130) bez fantomowej docinki', () => {
    const r = simulatePanelRegion(base({ width: 260, height: 20 }))
    expect(r.fullPlanks).toBe(2)
    expect(r.cutPieces).toBe(0)
    expect(r.totalPlanks).toBe(2)
  })
})
