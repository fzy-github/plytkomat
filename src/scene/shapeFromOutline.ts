import * as THREE from 'three'
import type { Surface } from '../geometry/surfaces'
import type { Rect } from '../model/types'

/** Model trzyma cm; scena three.js pracuje w metrach — pokój ma ~2-3 jednostki. */
export const SCALE = 0.01

/** Obrys powierzchni (0,0,w,h) z dziurami jako THREE.Shape, już w jednostkach sceny. */
export function surfaceShape(width: number, height: number, holes: Rect[]): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(width * SCALE, 0)
  shape.lineTo(width * SCALE, height * SCALE)
  shape.lineTo(0, height * SCALE)
  shape.closePath()
  for (const hole of holes) {
    const path = new THREE.Path()
    const x = hole.x * SCALE
    const y = hole.y * SCALE
    path.moveTo(x, y)
    path.lineTo(x + hole.w * SCALE, y)
    path.lineTo(x + hole.w * SCALE, y + hole.h * SCALE)
    path.lineTo(x, y + hole.h * SCALE)
    path.closePath()
    shape.holes.push(path)
  }
  return shape
}

/**
 * Macierz osadzenia lokalnej płaszczyzny XY geometrii w 3D: X→u, Y→v, Z→normal.
 * Dla podłogi baza jest lewoskrętna (det < 0) — lustro odwraca winding trójkątów,
 * co SurfaceMesh kompensuje doborem `side` materiału.
 */
export function surfaceMatrix(s: Surface): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(s.u.x, s.u.y, s.u.z),
    new THREE.Vector3(s.v.x, s.v.y, s.v.z),
    new THREE.Vector3(s.normal.x, s.normal.y, s.normal.z),
  )
  m.setPosition(s.origin.x * SCALE, s.origin.y * SCALE, s.origin.z * SCALE)
  return m
}
