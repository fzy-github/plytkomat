import type { Id } from '../model/types'

export type CalcMode = 'simple' | 'layout'

export interface RegionCalcResult {
  regionId: Id
  tileTypeId: Id
  /** Pole netto: region ∩ powierzchnia, minus dziury powierzchni. */
  netAreaM2: number
  mode: CalcMode
  /** Tylko tryb układu (M6): */
  fullTiles?: number
  cutCells?: number
  cutsServedByOffcuts?: number
  newTilesForCuts?: number
  /** Prosty: ceil(netto·(1+zapas)/pole płytki). Układ: pełne + nowe na docinki. */
  totalTiles: number
}

export interface TileTypeSummary {
  tileTypeId: Id
  netAreaM2: number
  /** Suma sztuk z regionów (w prostym trybie zapas już wliczony). */
  totalTiles: number
  /** Sztuki z zapasem: prosty = totalTiles; układ = ceil(totalTiles·(1+zapas)). */
  tilesWithWaste: number
  /** Sugerowany zakup w m². */
  purchaseAreaM2: number
}

/** Ostrzeżenie jako klucz i18n + parametry — UI tłumaczy. */
export interface CalcWarning {
  key: string
  params?: Record<string, string | number>
}

export interface ProjectCalcResult {
  regions: RegionCalcResult[]
  perTileType: TileTypeSummary[]
  warnings: CalcWarning[]
}
