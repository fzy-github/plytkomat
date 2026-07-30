import type {
  BoxElement,
  BoxFace,
  NicheElement,
  Project,
  Rect,
  RoomDimensions,
  SurfaceId,
  WallId,
} from '../model/types'
import { clampToBounds, EPS } from './rect'
import { add, dot, neg, scale, sub, vec3, type Vec3 } from './vec'

export interface SurfaceSource {
  type: 'room' | 'element'
  elementId?: string
  face?: string
}

/**
 * Płaska powierzchnia wyprowadzona z modelu — wspólne wejście renderera i
 * silnika obliczeń. Lokalne 2D: punkt (x, y) powierzchni leży w 3D w
 * `origin + x*u + y*v`.
 *
 * `normal` jest przechowywany jawnie — NIE wyprowadzać z u×v: dla podłogi
 * baza (u=+X, v=+Z) jest lewoskrętna względem normalnej (+Y).
 */
export interface Surface {
  id: SurfaceId
  origin: Vec3
  u: Vec3
  v: Vec3
  normal: Vec3
  width: number
  height: number
  /** Otwory (drzwi, wnęki, kontakty boxów); mogą się nakładać. */
  holes: Rect[]
  source: SurfaceSource
  tileableByDefault: boolean
}

/**
 * Tabela orientacji ścian — jedyne źródło konwencji lokalnych współrzędnych:
 * u biegnie od lewej do prawej PATRZĄC Z WNĘTRZA POKOJU, v od podłogi w górę,
 * normalna do wnętrza. Origin to lewy-dolny narożnik ściany widzianej z wnętrza.
 */
interface WallBasis {
  origin: (r: RoomDimensions) => Vec3
  u: Vec3
  normal: Vec3
  width: (r: RoomDimensions) => number
}

const WALL_BASES: Record<WallId, WallBasis> = {
  north: {
    origin: () => vec3(0, 0, 0),
    u: vec3(1, 0, 0),
    normal: vec3(0, 0, 1),
    width: (r) => r.width,
  },
  east: {
    origin: (r) => vec3(r.width, 0, 0),
    u: vec3(0, 0, 1),
    normal: vec3(-1, 0, 0),
    width: (r) => r.length,
  },
  south: {
    origin: (r) => vec3(r.width, 0, r.length),
    u: vec3(-1, 0, 0),
    normal: vec3(0, 0, -1),
    width: (r) => r.width,
  },
  west: {
    origin: (r) => vec3(0, 0, r.length),
    u: vec3(0, 0, -1),
    normal: vec3(1, 0, 0),
    width: (r) => r.length,
  },
}

const V_UP = vec3(0, 1, 0)

export function wallSurface(wall: WallId, room: RoomDimensions): Surface {
  const basis = WALL_BASES[wall]
  return {
    id: `wall:${wall}`,
    origin: basis.origin(room),
    u: basis.u,
    v: V_UP,
    normal: basis.normal,
    width: basis.width(room),
    height: room.height,
    holes: [],
    source: { type: 'room' },
    tileableByDefault: true,
  }
}

export function roomSurfaces(room: RoomDimensions): Surface[] {
  const walls = (['north', 'east', 'south', 'west'] as const).map((w) => wallSurface(w, room))
  const floor: Surface = {
    id: 'floor',
    origin: vec3(0, 0, 0),
    u: vec3(1, 0, 0),
    v: vec3(0, 0, 1),
    normal: vec3(0, 1, 0),
    width: room.width,
    height: room.length,
    holes: [],
    source: { type: 'room' },
    tileableByDefault: true,
  }
  const ceiling: Surface = {
    id: 'ceiling',
    origin: vec3(0, room.height, 0),
    u: vec3(1, 0, 0),
    v: vec3(0, 0, 1),
    normal: vec3(0, -1, 0),
    width: room.width,
    height: room.length,
    holes: [],
    source: { type: 'room' },
    tileableByDefault: false,
  }
  return [...walls, floor, ceiling]
}

/**
 * 5 powierzchni wnętrza wnęki. Konwencje lokalne (origin/u/v) dobrane tak, by
 * (0,0) było "lewym-dolnym" narożnikiem danej ścianki; normalne wskazują do
 * wnętrza wnęki/pokoju. Półki (bottom/top) mają v = od tyłu wnęki ku pokojowi.
 */
function nicheSurfaces(el: NicheElement, rect: Rect, wall: Surface): Surface[] {
  const { u, v } = wall
  const n = wall.normal
  const d = el.depth
  const at = (sx: number, sy: number, depth: number): Vec3 =>
    add(add(add(wall.origin, scale(u, sx)), scale(v, sy)), scale(n, -depth))
  const src = (face: string): SurfaceSource => ({ type: 'element', elementId: el.id, face })
  const common = { holes: [] as Rect[], tileableByDefault: true }
  return [
    {
      id: `niche:${el.id}:back`,
      origin: at(rect.x, rect.y, d),
      u, v, normal: n,
      width: rect.w, height: rect.h,
      source: src('back'), ...common,
    },
    {
      id: `niche:${el.id}:left`,
      origin: at(rect.x, rect.y, d),
      u: n, v, normal: u,
      width: d, height: rect.h,
      source: src('left'), ...common,
    },
    {
      id: `niche:${el.id}:right`,
      origin: at(rect.x + rect.w, rect.y, 0),
      u: neg(n), v, normal: neg(u),
      width: d, height: rect.h,
      source: src('right'), ...common,
    },
    {
      id: `niche:${el.id}:bottom`,
      origin: at(rect.x, rect.y, d),
      u, v: n, normal: v,
      width: rect.w, height: d,
      source: src('bottom'), ...common,
    },
    {
      id: `niche:${el.id}:top`,
      origin: at(rect.x, rect.y + rect.h, d),
      u, v: n, normal: neg(v),
      width: rect.w, height: d,
      source: src('top'), ...common,
    },
  ]
}

const BOX_FACES: BoxFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

/**
 * Ścianka boxu jako powierzchnia. Konwencja jak dla ścian pokoju: u od lewej
 * do prawej patrząc na ściankę z zewnątrz boxu, v w górę (dla top/bottom jak
 * podłoga/sufit: u=+X, v=+Z, normalna jawna).
 */
function boxFaceSurface(el: BoxElement, face: BoxFace): Surface {
  const p = el.pos
  const s = el.size
  const mk = (origin: Vec3, u: Vec3, v: Vec3, normal: Vec3, width: number, height: number): Surface => ({
    id: `el:${el.id}:${face}`,
    origin, u, v, normal, width, height,
    holes: [],
    source: { type: 'element', elementId: el.id, face },
    tileableByDefault: true,
  })
  const up = vec3(0, 1, 0)
  switch (face) {
    case 'front':
      return mk(vec3(p.x, p.y, p.z + s.z), vec3(1, 0, 0), up, vec3(0, 0, 1), s.x, s.y)
    case 'back':
      return mk(vec3(p.x + s.x, p.y, p.z), vec3(-1, 0, 0), up, vec3(0, 0, -1), s.x, s.y)
    case 'left':
      return mk(vec3(p.x, p.y, p.z), vec3(0, 0, 1), up, vec3(-1, 0, 0), s.z, s.y)
    case 'right':
      return mk(vec3(p.x + s.x, p.y, p.z + s.z), vec3(0, 0, -1), up, vec3(1, 0, 0), s.z, s.y)
    case 'top':
      return mk(vec3(p.x, p.y + s.y, p.z), vec3(1, 0, 0), vec3(0, 0, 1), vec3(0, 1, 0), s.x, s.z)
    case 'bottom':
      return mk(vec3(p.x, p.y, p.z), vec3(1, 0, 0), vec3(0, 0, 1), vec3(0, -1, 0), s.x, s.z)
  }
}

const oppositeNormals = (a: Vec3, b: Vec3): boolean =>
  Math.abs(a.x + b.x) < EPS && Math.abs(a.y + b.y) < EPS && Math.abs(a.z + b.z) < EPS

/**
 * Rozwiązywanie kontaktu ścianki boxu z powierzchnią pokoju: koplanarna
 * (± EPS), przeciwna normalna i niepusty rzut → ścianka stłumiona, a rzut
 * wybity jako dziura w powierzchni pokoju. Zwraca true, gdy kontakt zaszedł.
 */
function resolveContact(face: Surface, roomSurfs: Surface[]): boolean {
  for (const rs of roomSurfs) {
    if (!oppositeNormals(face.normal, rs.normal)) continue
    if (Math.abs(dot(sub(face.origin, rs.origin), rs.normal)) > EPS) continue
    const c1 = face.origin
    const c2 = add(add(face.origin, scale(face.u, face.width)), scale(face.v, face.height))
    const x1 = dot(sub(c1, rs.origin), rs.u)
    const y1 = dot(sub(c1, rs.origin), rs.v)
    const x2 = dot(sub(c2, rs.origin), rs.u)
    const y2 = dot(sub(c2, rs.origin), rs.v)
    const rect: Rect = {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    }
    const overlap = clampToBounds(rect, rs.width, rs.height)
    if (!overlap) continue
    rs.holes.push(overlap)
    return true
  }
  return false
}

/**
 * Wyprowadza wszystkie płaskie powierzchnie projektu.
 *
 * 1. 6 powierzchni pokoju (sufit tylko do renderu).
 * 2. Otwory (drzwi/okna) → dziury w ścianie-hoście, żadnych nowych powierzchni.
 * 3. Wnęki → dziura w ścianie + 5 powierzchni wnętrza.
 * 4. Boxy → do 6 ścianek; ścianka koplanarna z powierzchnią pokoju i nachodząca
 *    na nią jest tłumiona, a prostokąt kontaktu wybijany jako dziura (zabudowa
 *    wanny przy ścianach, footprint na podłodze, ścianka dobita do ściany).
 *    Kontakt box↔box NIE jest rozwiązywany (bez CSG) — udokumentowane
 *    ograniczenie; ostrzeżenie o nakładaniu emituje silnik obliczeń.
 *
 * Recty otworów/wnęk są przycinane do granic ściany (edycja wymiarów pokoju
 * nie może wywrócić derywacji). V1: wnęki i otwory tylko na 4 ścianach pokoju;
 * hostowanie na ściankach działowych to punkt rozszerzenia.
 */
export function deriveSurfaces(project: Project): Surface[] {
  const surfaces = roomSurfaces(project.room)
  const roomSurfs = [...surfaces]
  const walls = new Map(surfaces.map((s) => [s.id, s]))

  for (const el of project.elements) {
    if (el.kind === 'opening') {
      const wall = walls.get(`wall:${el.wall}`)
      if (!wall) continue
      const hole = clampToBounds(el.rect, wall.width, wall.height)
      if (hole) wall.holes.push(hole)
    } else if (el.kind === 'niche') {
      const wall = walls.get(`wall:${el.wall}`)
      if (!wall) continue
      const rect = clampToBounds(el.rect, wall.width, wall.height)
      if (!rect) continue
      wall.holes.push(rect)
      surfaces.push(...nicheSurfaces(el, rect, wall))
    } else {
      for (const face of BOX_FACES) {
        if (el.faces?.[face] === false) continue
        const faceSurface = boxFaceSurface(el, face)
        if (!resolveContact(faceSurface, roomSurfs)) surfaces.push(faceSurface)
      }
    }
  }
  return surfaces
}
