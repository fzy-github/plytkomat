import type { TileType } from '../model/types'

/**
 * Tryb prosty: liczba płytek z pola netto powiększonego o zapas.
 * Fuga celowo ignorowana (wynik konserwatywny — lekko zawyżony).
 */
export function simpleTileCount(
  netAreaCm2: number,
  tile: Pick<TileType, 'width' | 'height'>,
  wastePercent: number,
): number {
  if (netAreaCm2 <= 0) return 0
  const tileArea = tile.width * tile.height
  if (tileArea <= 0) return 0
  return Math.ceil((netAreaCm2 * (1 + wastePercent / 100)) / tileArea)
}
