import { describe, expect, it } from 'vitest'
import { deriveSurfaces } from '../geometry/surfaces'
import { defaultProject } from '../model/defaults'
import type { BoxElement, Project, TileRegion, TileType } from '../model/types'
import { calculateProject } from './engine'

const TILE: TileType = {
  id: 'tt1',
  name: 'Płytka',
  width: 60,
  height: 30,
  color: '#e07a5f',
  rotatable: true,
}

function makeProject(overrides: Partial<Project>): Project {
  return {
    ...defaultProject(),
    room: { width: 300, length: 200, height: 250 },
    tileTypes: [TILE],
    ...overrides,
  }
}

function region(surfaceId: string, rect: TileRegion['rect']): TileRegion {
  return { id: `r-${surfaceId}`, surfaceId, rect, tileTypeId: 'tt1' }
}

const calc = (p: Project) => calculateProject(p, deriveSurfaces(p), 'simple')

describe('calculateProject — tryb prosty', () => {
  it('region 200×100 na ścianie: net 2 m², 13 płytek, 2.2 m² zakupu', () => {
    const p = makeProject({ regions: [region('wall:north', { x: 0, y: 0, w: 200, h: 100 })] })
    const { regions, perTileType, warnings } = calc(p)
    expect(warnings).toEqual([])
    expect(regions[0].netAreaM2).toBeCloseTo(2.0, 10)
    expect(regions[0].totalTiles).toBe(13)
    expect(perTileType[0].tilesWithWaste).toBe(13)
    expect(perTileType[0].purchaseAreaM2).toBeCloseTo(2.2, 10)
  })

  it('dziura w powierzchni zmniejsza netto (drzwi w ścianie)', () => {
    const p = makeProject({
      elements: [
        {
          id: 'd1',
          kind: 'opening',
          name: 'Drzwi',
          wall: 'north',
          rect: { x: 70, y: 35, w: 60, h: 30 },
        },
      ],
      regions: [region('wall:north', { x: 0, y: 0, w: 200, h: 100 })],
    })
    const { regions } = calc(p)
    // 20000 - 1800 = 18200 cm² = 1.82 m²; 18200·1.1/1800 = 11.12 → 12
    expect(regions[0].netAreaM2).toBeCloseTo(1.82, 10)
    expect(regions[0].totalTiles).toBe(12)
  })

  it('cała podłoga liczy się netto od footprintu wanny (integracja z derywacją)', () => {
    const tub: BoxElement = {
      id: 't1',
      kind: 'tubEnclosure',
      name: 'Wanna',
      pos: { x: 0, y: 0, z: 0 },
      size: { x: 170, y: 60, z: 60 },
      faces: { top: false },
    }
    const p = makeProject({
      elements: [tub],
      regions: [region('floor', { x: 0, y: 0, w: 300, h: 200 })],
    })
    const { regions } = calc(p)
    // 300·200 - 170·60 = 60000 - 10200 = 49800 cm² = 4.98 m²
    expect(regions[0].netAreaM2).toBeCloseTo(4.98, 10)
  })

  it('region-sierota (skasowany element) daje ostrzeżenie i jest pomijany', () => {
    const p = makeProject({
      regions: [region('el:zombie:front', { x: 0, y: 0, w: 50, h: 50 })],
    })
    const { regions, warnings } = calc(p)
    expect(regions).toEqual([])
    expect(warnings).toContainEqual({
      key: 'warnings.orphanRegion',
      params: { id: 'el:zombie:front' },
    })
  })

  it('region całkiem poza powierzchnią → ostrzeżenie i 0 płytek', () => {
    const p = makeProject({
      regions: [region('wall:north', { x: 500, y: 0, w: 50, h: 50 })],
    })
    const { regions, warnings } = calc(p)
    expect(regions[0].totalTiles).toBe(0)
    expect(warnings.some((w) => w.key === 'warnings.regionOutside')).toBe(true)
  })

  it('region wystający poza powierzchnię jest przycinany z ostrzeżeniem', () => {
    const p = makeProject({
      regions: [region('wall:north', { x: 250, y: 0, w: 100, h: 100 })],
    })
    const { regions, warnings } = calc(p)
    expect(regions[0].netAreaM2).toBeCloseTo(0.5, 10)
    expect(warnings.some((w) => w.key === 'warnings.regionClipped')).toBe(true)
  })

  it('nakładające się regiony na jednej powierzchni → ostrzeżenie', () => {
    const p = makeProject({
      regions: [
        { id: 'r1', surfaceId: 'wall:north', rect: { x: 0, y: 0, w: 100, h: 100 }, tileTypeId: 'tt1' },
        { id: 'r2', surfaceId: 'wall:north', rect: { x: 50, y: 50, w: 100, h: 100 }, tileTypeId: 'tt1' },
      ],
    })
    const { warnings } = calc(p)
    expect(warnings.some((w) => w.key === 'warnings.regionsOverlap')).toBe(true)
  })

  it('nakładające się boxy → ostrzeżenie', () => {
    const box = (id: string, x: number): BoxElement => ({
      id,
      kind: 'box',
      name: id,
      pos: { x, y: 0, z: 0 },
      size: { x: 60, y: 100, z: 30 },
    })
    const p = makeProject({ elements: [box('b1', 0), box('b2', 30)] })
    const { warnings } = calc(p)
    expect(warnings).toContainEqual({
      key: 'warnings.elementsOverlap',
      params: { a: 'b1', b: 'b2' },
    })
  })

  it('boxy stykające się ścianami (bez przenikania) nie generują ostrzeżenia', () => {
    const box = (id: string, x: number): BoxElement => ({
      id,
      kind: 'box',
      name: id,
      pos: { x, y: 0, z: 0 },
      size: { x: 60, y: 100, z: 30 },
    })
    const p = makeProject({ elements: [box('b1', 0), box('b2', 60)] })
    const { warnings } = calc(p)
    expect(warnings.every((w) => w.key !== 'warnings.elementsOverlap')).toBe(true)
  })

  it('agregacja per typ: dwa regiony sumują się', () => {
    const p = makeProject({
      regions: [
        { id: 'r1', surfaceId: 'wall:north', rect: { x: 0, y: 0, w: 100, h: 100 }, tileTypeId: 'tt1' },
        { id: 'r2', surfaceId: 'wall:south', rect: { x: 0, y: 0, w: 100, h: 100 }, tileTypeId: 'tt1' },
      ],
    })
    const { perTileType } = calc(p)
    expect(perTileType).toHaveLength(1)
    expect(perTileType[0].netAreaM2).toBeCloseTo(2.0, 10)
    // 2 × ceil(10000·1.1/1800) = 2 × 7 = 14
    expect(perTileType[0].totalTiles).toBe(14)
  })
})

describe('calculateProject — tryb układu', () => {
  it('region 200×100: 12 płytek dokładnie, zapas jako rezerwa → 14 z zapasem 10%', () => {
    const p = makeProject({ regions: [region('wall:north', { x: 0, y: 0, w: 200, h: 100 })] })
    const { regions, perTileType } = calculateProject(p, deriveSurfaces(p), 'layout')
    expect(regions[0].mode).toBe('layout')
    expect(regions[0].fullTiles).toBe(9)
    expect(regions[0].cutCells).toBe(7)
    expect(regions[0].totalTiles).toBe(12)
    // Rezerwa: ceil(12·1.1) = 14; zakup = 14 · 0.18 m².
    expect(perTileType[0].tilesWithWaste).toBe(14)
    expect(perTileType[0].purchaseAreaM2).toBeCloseTo(14 * 0.18, 10)
  })

  it('dziura powierzchni trafia do symulacji w lokalnych współrzędnych regionu', () => {
    const p = makeProject({
      elements: [
        {
          id: 'd1',
          kind: 'opening',
          name: 'Okno',
          wall: 'north',
          rect: { x: 100, y: 50, w: 60, h: 30 },
        },
      ],
      // Region przesunięty: (40,20)..(240,120); dziura w lokalnych (60,30).
      regions: [region('wall:north', { x: 40, y: 20, w: 200, h: 100 })],
    })
    const { regions } = calculateProject(p, deriveSurfaces(p), 'layout')
    // Netto: 2 m² − 0.18 m² dziury = 1.82 m².
    expect(regions[0].netAreaM2).toBeCloseTo(1.82, 10)
    // Dziura 60×30 w (60,30) lokalnie: przykrywa fragmenty komórek → więcej
    // docinek niż bez dziury; sanity: totalTiles ≥ 9 pełnych bez tej strefy.
    expect(regions[0].cutCells).toBeGreaterThan(7)
  })
})
