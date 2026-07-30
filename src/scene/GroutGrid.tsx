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
 * Podpowiedź skali płytek: linie siatki co (płytka + fuga) wewnątrz regionu.
 * Czysto wizualna — nie uwzględnia dziur; źródłem prawdy jest symulacja układu.
 */
export function GroutGrid({ region, surface, tileType, grout }: Props) {
  const geometry = useMemo(() => {
    const clipped = clampToBounds(region.rect, surface.width, surface.height)
    if (!clipped) return null
    const pitchX = tileType.width + grout
    const pitchY = tileType.height + grout
    const pts: number[] = []
    for (let i = 1; i * pitchX < clipped.w - EPS; i++) {
      const x = (clipped.x + i * pitchX) * SCALE
      pts.push(x, clipped.y * SCALE, 0, x, (clipped.y + clipped.h) * SCALE, 0)
    }
    for (let j = 1; j * pitchY < clipped.h - EPS; j++) {
      const y = (clipped.y + j * pitchY) * SCALE
      pts.push(clipped.x * SCALE, y, 0, (clipped.x + clipped.w) * SCALE, y, 0)
    }
    if (pts.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }, [region.rect, surface, tileType, grout])

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
