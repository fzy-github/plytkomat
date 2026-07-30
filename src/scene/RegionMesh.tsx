import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { clampToBounds, subtractToCells } from '../geometry/rect'
import type { Surface } from '../geometry/surfaces'
import { cross, dot } from '../geometry/vec'
import type { TileRegion, TileType } from '../model/types'
import { rectShape, SCALE, surfaceMatrix } from './shapeFromOutline'

interface Props {
  region: TileRegion
  surface: Surface
  tileType: TileType
  selected: boolean
  hovered: boolean
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}

/** Odsunięcie nakładki od powierzchni wzdłuż normalnej (cm) — anty z-fighting. */
const REGION_OFFSET = 0.2

/**
 * Kolorowa nakładka regionu płytek: rect regionu przycięty do powierzchni,
 * minus dziury powierzchni (ta sama dekompozycja co w silniku obliczeń),
 * odsunięta o 0.2 cm wzdłuż normalnej.
 */
export function RegionMesh({
  region,
  surface,
  tileType,
  selected,
  hovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  // Macierz wypiekana w geometrię — jak w SurfaceMesh: raycast three.js działa
  // w przestrzeni lokalnej i lustrzana baza (podłoga) psułaby picking regionów.
  const geometry = useMemo(() => {
    const clipped = clampToBounds(region.rect, surface.width, surface.height)
    if (!clipped) return null
    const shapes = subtractToCells(clipped, surface.holes).uncovered.map(rectShape)
    if (shapes.length === 0) return null
    const offset = new THREE.Matrix4().makeTranslation(
      surface.normal.x * REGION_OFFSET * SCALE,
      surface.normal.y * REGION_OFFSET * SCALE,
      surface.normal.z * REGION_OFFSET * SCALE,
    )
    const geo = new THREE.ShapeGeometry(shapes)
    geo.applyMatrix4(offset.multiply(surfaceMatrix(surface)))
    return geo
  }, [region.rect, surface])
  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) return null

  const side =
    dot(cross(surface.u, surface.v), surface.normal) > 0 ? THREE.FrontSide : THREE.BackSide

  return (
    <mesh
      geometry={geometry}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial
        color={tileType.color}
        side={side}
        transparent
        opacity={hovered || selected ? 1 : 0.92}
        polygonOffset
        polygonOffsetFactor={-1}
      />
      {selected && <Edges color="#1d4ed8" lineWidth={2} />}
    </mesh>
  )
}
