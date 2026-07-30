import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { cross, dot } from '../geometry/vec'
import type { Surface } from '../geometry/surfaces'
import { surfaceMatrix, surfaceShapes } from './shapeFromOutline'

interface Props {
  surface: Surface
  color: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void
}

/**
 * Pojedyncza płaska powierzchnia. Mesh jest jednostronny i odwrócony do
 * wnętrza pokoju — back-face culling daje efekt „domku dla lalek": przy
 * orbitowaniu z zewnątrz bliższe ściany i sufit znikają same.
 *
 * Macierz osadzenia jest WYPIEKANA w geometrię (applyMatrix4), nie podawana
 * na meshu: raycast three.js działa w przestrzeni lokalnej i przy lustrzanej
 * bazie (podłoga, det<0) macierz na meshu psuje picking — winding odbija się
 * dopiero w screen space, a raycast culluje w lokalnej.
 */
export function SurfaceMesh({ surface, color, onClick, onPointerOver, onPointerOut }: Props) {
  const geometry = useMemo(() => {
    const geo = new THREE.ShapeGeometry(
      surfaceShapes(surface.width, surface.height, surface.holes),
    )
    geo.applyMatrix4(surfaceMatrix(surface))
    return geo
  }, [surface])
  useEffect(() => () => geometry.dispose(), [geometry])

  // Lewoskrętna baza (podłoga) lustrzanie odwraca winding — widoczna zostaje
  // "tylna" strona; dobór side utrzymuje jednostronność zawsze od strony normalnej.
  const side =
    dot(cross(surface.u, surface.v), surface.normal) > 0 ? THREE.FrontSide : THREE.BackSide
  return (
    <mesh
      geometry={geometry}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <meshStandardMaterial color={color} side={side} />
    </mesh>
  )
}
