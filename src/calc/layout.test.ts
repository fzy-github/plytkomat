import { describe, expect, it } from 'vitest'
import { simulateRegion, type LayoutInput } from './layout'

const base = (over: Partial<LayoutInput>): LayoutInput => ({
  width: 200,
  height: 100,
  holes: [],
  tile: { width: 60, height: 30, rotatable: true },
  grout: 0.2,
  minOffcut: 5,
  pattern: 'grid',
  ...over,
})

describe('simulateRegion — kanoniczny przypadek liczony ręcznie', () => {
  it('200×100, płytka 60×30, fuga 0.2 → siatka 4×4: 9 pełnych, 7 docinek, 3 nowe → 12', () => {
    // Kolumny: 0, 60.2, 120.4 pełne (60) + 180.6 (docinka 19.4).
    // Rzędy: 0, 30.2, 60.4 pełne (30) + 90.6 (docinka 9.4).
    // Docinki: 3× 19.4×30, 3× 60×9.4, 1× 19.4×9.4.
    // Greedy (malejąco po polu): 19.4×30 (582) ×3, 60×9.4 (564) ×3, 19.4×9.4.
    //  1. nowa (resztka 40.6×30) → 2. ze ścinki (21.2×30) → 3. ze ścinki (1.8×30 przepada)
    //  4. nowa (resztka 60×20.6) → 5. ze ścinki (60×11.2) → 6. ze ścinki (60×1.8 przepada)
    //  7. nowa.
    const r = simulateRegion(base({}))
    expect(r.fullTiles).toBe(9)
    expect(r.cutCells).toBe(7)
    expect(r.cutsServedByOffcuts).toBe(4)
    expect(r.newTilesForCuts).toBe(3)
    expect(r.totalTiles).toBe(12)
  })
})

describe('simulateRegion — ponowne użycie ścinek', () => {
  it('80×60, płytka 60×30, fuga 0 → 2 pełne + 2 docinki 20×30, resztka obsługuje drugą → 3', () => {
    const r = simulateRegion(base({ width: 80, height: 60, grout: 0 }))
    expect(r.fullTiles).toBe(2)
    expect(r.cutCells).toBe(2)
    expect(r.cutsServedByOffcuts).toBe(1)
    expect(r.newTilesForCuts).toBe(1)
    expect(r.totalTiles).toBe(3)
  })

  it('rotacja 90° pozwala użyć ścinki, której bez rotacji nie da się użyć', () => {
    // 75×38, płytka 60×30, fuga 0: pełna (0,0); docinki 60×8, 15×30, 15×8.
    // Popyt malejąco: 60×8 → nowa (resztka 60×22); 15×30 pasuje do 60×22
    // TYLKO po rotacji (30×15); 15×8 ze ścinki.
    const rotatable = simulateRegion(base({ width: 75, height: 38, grout: 0 }))
    expect(rotatable.totalTiles).toBe(2)
    expect(rotatable.cutsServedByOffcuts).toBe(2)

    const fixed = simulateRegion(
      base({ width: 75, height: 38, grout: 0, tile: { width: 60, height: 30, rotatable: false } }),
    )
    expect(fixed.totalTiles).toBe(3)
    expect(fixed.cutsServedByOffcuts).toBe(1)
  })
})

describe('simulateRegion — dziury', () => {
  it('komórka w całości zakryta dziurą jest pomijana', () => {
    const r = simulateRegion(
      base({ width: 120, height: 30, grout: 0, holes: [{ x: 60, y: 0, w: 60, h: 30 }] }),
    )
    expect(r.fullTiles).toBe(1)
    expect(r.cutCells).toBe(0)
    expect(r.totalTiles).toBe(1)
  })

  it('dziura ściśle wewnątrz komórki → docinka zużywa całą płytkę bez kredytu ścinki', () => {
    const r = simulateRegion(
      base({ width: 60, height: 30, grout: 0, holes: [{ x: 20, y: 10, w: 20, h: 10 }] }),
    )
    expect(r.fullTiles).toBe(0)
    expect(r.cutCells).toBe(1)
    // bbox widocznej części = cała komórka 60×30 → nowa płytka, zero resztek.
    expect(r.newTilesForCuts).toBe(1)
    expect(r.totalTiles).toBe(1)
  })

  it('komórki częściowo zakryte dziurą liczą się jako docinki', () => {
    // 120×30, fuga 0, dziura 30×30 na styku dwóch komórek (x 45..75).
    const r = simulateRegion(
      base({ width: 120, height: 30, grout: 0, holes: [{ x: 45, y: 0, w: 30, h: 30 }] }),
    )
    expect(r.fullTiles).toBe(0)
    expect(r.cutCells).toBe(2)
    // Zapotrzebowania: 45×30 i 45×30 → nowa (resztka 15×30 za mała na 45×30,
    // po rotacji też nie: 15<30) → 2 nowe.
    expect(r.newTilesForCuts).toBe(2)
  })
})

describe('simulateRegion — krawędzie', () => {
  it('płytka większa niż region → 1 docinka, 1 nowa płytka', () => {
    const r = simulateRegion(base({ width: 40, height: 20, grout: 0 }))
    expect(r.fullTiles).toBe(0)
    expect(r.cutCells).toBe(1)
    expect(r.totalTiles).toBe(1)
  })

  it('dokładne dopasowanie z fugą: 180.6 → 3 kolumny, bez fantomowej czwartej (EPS)', () => {
    // 3·60 + 2·0.2 = 180.4; kolumna 4 startowałaby na 180.6 = szerokość regionu.
    const r = simulateRegion(base({ width: 180.6, height: 30, grout: 0.2 }))
    expect(r.fullTiles).toBe(3)
    expect(r.cutCells).toBe(0)
    expect(r.totalTiles).toBe(3)
  })

  it('region zdegenerowany → 0', () => {
    expect(simulateRegion(base({ width: 0 })).totalTiles).toBe(0)
    expect(simulateRegion(base({ height: 0 })).totalTiles).toBe(0)
  })

  it('fuga 0 działa', () => {
    const r = simulateRegion(base({ width: 120, height: 60, grout: 0 }))
    expect(r.fullTiles).toBe(4)
    expect(r.totalTiles).toBe(4)
  })
})
