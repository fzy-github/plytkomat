import * as THREE from 'three'
import { subtractToCells } from '../geometry/rect'
import type { Surface } from '../geometry/surfaces'
import type { Rect } from '../model/types'

/** Model trzyma cm; scena three.js pracuje w metrach — pokój ma ~2-3 jednostki. */
export const SCALE = 0.01

export function rectShape(r: Rect): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(r.x * SCALE, r.y * SCALE)
  shape.lineTo((r.x + r.w) * SCALE, r.y * SCALE)
  shape.lineTo((r.x + r.w) * SCALE, (r.y + r.h) * SCALE)
  shape.lineTo(r.x * SCALE, (r.y + r.h) * SCALE)
  shape.closePath()
  return shape
}

/**
 * Powierzchnia z dziurami jako zbiór Shape'ów: zamiast dziur w earcut
 * (który nie wspiera dziur nakładających się ani stykających z obrysem)
 * renderujemy sumę niezakrytych komórek z kompresji współrzędnych —
 * dokładnie tę samą dekompozycję, której używa silnik obliczeń.
 */
export function surfaceShapes(width: number, height: number, holes: Rect[]): THREE.Shape[] {
  const outline: Rect = { x: 0, y: 0, w: width, h: height }
  if (holes.length === 0) return [rectShape(outline)]
  return subtractToCells(outline, holes).uncovered.map(rectShape)
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
