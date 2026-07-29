import { useMemo } from 'react'
import * as THREE from 'three'
import { cross, dot } from '../geometry/vec'
import type { Surface } from '../geometry/surfaces'
import { surfaceMatrix, surfaceShapes } from './shapeFromOutline'

interface Props {
  surface: Surface
  color: string
}

/**
 * Pojedyncza płaska powierzchnia. Mesh jest jednostronny i odwrócony do
 * wnętrza pokoju — back-face culling daje efekt „domku dla lalek": przy
 * orbitowaniu z zewnątrz bliższe ściany i sufit znikają same.
 */
export function SurfaceMesh({ surface, color }: Props) {
  const shapes = useMemo(
    () => surfaceShapes(surface.width, surface.height, surface.holes),
    [surface],
  )
  const matrix = useMemo(() => surfaceMatrix(surface), [surface])
  // Lewoskrętna baza (podłoga) lustrzanie odwraca winding — widoczna zostaje
  // "tylna" strona; dobór side utrzymuje jednostronność zawsze od strony normalnej.
  const side =
    dot(cross(surface.u, surface.v), surface.normal) > 0 ? THREE.FrontSide : THREE.BackSide
  return (
    <mesh matrix={matrix} matrixAutoUpdate={false}>
      <shapeGeometry args={[shapes]} />
      <meshStandardMaterial color={color} side={side} />
    </mesh>
  )
}
