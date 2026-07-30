import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { clampToBounds, EPS } from '../geometry/rect'
import type { Surface } from '../geometry/surfaces'
import type { TileRegion, TileType } from '../model/types'
import { SCALE, surfaceMatrix } from './shapeFromOutline'

interface Props {
  region: TileRegion
  surface: Surface
  tileType: TileType
  grout: number
}

/** Odsunięcie linii ponad nakładkę regionu (region jest na +0.2 cm). */
const GRID_OFFSET = 0.35

/**
 * Podpowiedź skali materiału. Płytki: siatka co (płytka + fuga). Panele:
 * wyłącznie linie rzędów co szerokość deski (styki czołowe są przewiązane,
 * więc celowo pominięte), oś zależna od kierunku regionu, bez fugi.
 * Czysto wizualna — nie uwzględnia dziur; źródłem prawdy jest symulacja.
 */
export function GroutGrid({ region, surface, tileType, grout }: Props) {
  const geometry = useMemo(() => {
    const clipped = clampToBounds(region.rect, surface.width, surface.height)
    if (!clipped) return null
    const pts: number[] = []
    const vLine = (x: number) =>
      pts.push(x * SCALE, clipped.y * SCALE, 0, x * SCALE, (clipped.y + clipped.h) * SCALE, 0)
    const hLine = (y: number) =>
      pts.push(clipped.x * SCALE, y * SCALE, 0, (clipped.x + clipped.w) * SCALE, y * SCALE, 0)

    if (tileType.kind === 'panel') {
      const pitch = tileType.height
      if ((region.direction ?? 'u') === 'u') {
        for (let j = 1; j * pitch < clipped.h - EPS; j++) hLine(clipped.y + j * pitch)
      } else {
        for (let i = 1; i * pitch < clipped.w - EPS; i++) vLine(clipped.x + i * pitch)
      }
    } else {
      const pitchX = tileType.width + grout
      const pitchY = tileType.height + grout
      for (let i = 1; i * pitchX < clipped.w - EPS; i++) vLine(clipped.x + i * pitchX)
      for (let j = 1; j * pitchY < clipped.h - EPS; j++) hLine(clipped.y + j * pitchY)
    }
    if (pts.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [region.rect, region.direction, surface, tileType, grout])

  useEffect(() => () => geometry?.dispose(), [geometry])

  const matrix = useMemo(() => {
    const offset = new THREE.Matrix4().makeTranslation(
      surface.normal.x * GRID_OFFSET * SCALE,
      surface.normal.y * GRID_OFFSET * SCALE,
      surface.normal.z * GRID_OFFSET * SCALE,
    )
    return offset.multiply(surfaceMatrix(surface))
  }, [surface])

  if (!geometry) return null

  return (
    <lineSegments
      geometry={geometry}
      matrix={matrix}
      matrixAutoUpdate={false}
      raycast={() => null}
    >
      <lineBasicMaterial color="#1f2430" transparent opacity={0.35} />
    </lineSegments>
  )
}
