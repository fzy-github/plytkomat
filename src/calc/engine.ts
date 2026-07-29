import type { Surface } from '../geometry/surfaces'
import { areaMinusHoles, clampToBounds, EPS, intersect } from '../geometry/rect'
import type { BoxElement, Project, Rect, TileType } from '../model/types'
import { simpleTileCount } from './simple'
import type {
  CalcMode,
  CalcWarning,
  ProjectCalcResult,
  RegionCalcResult,
  TileTypeSummary,
} from './types'

const isBox = (el: Project['elements'][number]): el is BoxElement =>
  el.kind === 'partition' || el.kind === 'tubEnclosure' || el.kind === 'box'

const aabbOverlap = (a: BoxElement, b: BoxElement): boolean =>
  a.pos.x < b.pos.x + b.size.x - EPS &&
  b.pos.x < a.pos.x + a.size.x - EPS &&
  a.pos.y < b.pos.y + b.size.y - EPS &&
  b.pos.y < a.pos.y + a.size.y - EPS &&
  a.pos.z < b.pos.z + b.size.z - EPS &&
  b.pos.z < a.pos.z + a.size.z - EPS

/**
 * Główne wejście obliczeń: przycina regiony do powierzchni, odejmuje dziury,
 * liczy sztuki per region i agreguje per typ płytki. Czysty TS — bez React/three.
 *
 * Tryb 'layout' (symulacja układu) dochodzi w M6 — do tego czasu regiony
 * liczone są trybem prostym niezależnie od przekazanego mode.
 */
export function calculateProject(
  project: Project,
  surfaces: Surface[],
  mode: CalcMode,
): ProjectCalcResult {
  const warnings: CalcWarning[] = []
  const results: RegionCalcResult[] = []
  const surfaceById = new Map(surfaces.map((s) => [s.id, s]))
  const typeById = new Map(project.tileTypes.map((tt) => [tt.id, tt]))
  const waste = project.settings.wastePercent

  // Kontakt box↔box nie jest rozwiązywany w geometrii (bez CSG) —
  // nachodzące boxy oznaczają zawyżone pola ich ścianek.
  const boxes = project.elements.filter(isBox)
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (aabbOverlap(boxes[i], boxes[j])) {
        warnings.push({
          key: 'warnings.elementsOverlap',
          params: { a: boxes[i].name, b: boxes[j].name },
        })
      }
    }
  }

  // Przycięte recty per powierzchnia — do ostrzeżeń o nakładaniu.
  const clippedBySurface = new Map<string, { name: string; rect: Rect }[]>()

  for (const region of project.regions) {
    const surface = surfaceById.get(region.surfaceId)
    const tileType = typeById.get(region.tileTypeId)
    if (!surface || !tileType) {
      warnings.push({ key: 'warnings.orphanRegion', params: { id: region.surfaceId } })
      continue
    }
    const clipped = clampToBounds(region.rect, surface.width, surface.height)
    if (!clipped) {
      warnings.push({ key: 'warnings.regionOutside', params: { surface: surface.id } })
      results.push({
        regionId: region.id,
        tileTypeId: tileType.id,
        netAreaM2: 0,
        mode,
        totalTiles: 0,
      })
      continue
    }
    if (
      Math.abs(clipped.w - region.rect.w) > EPS ||
      Math.abs(clipped.h - region.rect.h) > EPS
    ) {
      warnings.push({ key: 'warnings.regionClipped', params: { surface: surface.id } })
    }

    const list = clippedBySurface.get(surface.id) ?? []
    list.push({ name: tileType.name, rect: clipped })
    clippedBySurface.set(surface.id, list)

    const netCm2 = areaMinusHoles(clipped, surface.holes)
    results.push(regionResult(region.id, tileType, netCm2, waste, mode))
  }

  for (const [surfaceId, rects] of clippedBySurface) {
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (intersect(rects[i].rect, rects[j].rect)) {
          warnings.push({ key: 'warnings.regionsOverlap', params: { surface: surfaceId } })
        }
      }
    }
  }

  return { regions: results, perTileType: summarize(results, typeById, waste), warnings }
}

function regionResult(
  regionId: string,
  tileType: TileType,
  netCm2: number,
  wastePercent: number,
  mode: CalcMode,
): RegionCalcResult {
  // M6 podmieni gałąź 'layout' na symulację siatki.
  return {
    regionId,
    tileTypeId: tileType.id,
    netAreaM2: netCm2 / 10_000,
    mode,
    totalTiles: simpleTileCount(netCm2, tileType, wastePercent),
  }
}

function summarize(
  results: RegionCalcResult[],
  typeById: Map<string, TileType>,
  wastePercent: number,
): TileTypeSummary[] {
  const byType = new Map<string, TileTypeSummary>()
  for (const r of results) {
    const tt = typeById.get(r.tileTypeId)
    if (!tt) continue
    const entry = byType.get(tt.id) ?? {
      tileTypeId: tt.id,
      netAreaM2: 0,
      totalTiles: 0,
      tilesWithWaste: 0,
      purchaseAreaM2: 0,
    }
    entry.netAreaM2 += r.netAreaM2
    entry.totalTiles += r.totalTiles
    byType.set(tt.id, entry)
  }
  for (const entry of byType.values()) {
    const tt = typeById.get(entry.tileTypeId)
    if (!tt) continue
    const tileAreaM2 = (tt.width * tt.height) / 10_000
    const anyLayout = results.some(
      (r) => r.tileTypeId === entry.tileTypeId && r.mode === 'layout',
    )
    if (anyLayout) {
      // Tryb układu: wynik dokładny, zapas jako rezerwa na stłuczenia.
      entry.tilesWithWaste = Math.ceil(entry.totalTiles * (1 + wastePercent / 100))
      entry.purchaseAreaM2 = entry.tilesWithWaste * tileAreaM2
    } else {
      // Tryb prosty: zapas wliczony już w totalTiles.
      entry.tilesWithWaste = entry.totalTiles
      entry.purchaseAreaM2 = entry.netAreaM2 * (1 + wastePercent / 100)
    }
  }
  return [...byType.values()]
}
