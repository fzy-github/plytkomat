import type { NicheElement, Project, Rect, RoomDimensions, SurfaceId, WallId } from '../model/types'
import { clampToBounds } from './rect'
import { add, neg, scale, vec3, type Vec3 } from './vec'

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

/**
 * Wyprowadza wszystkie płaskie powierzchnie projektu.
 *
 * 1. 6 powierzchni pokoju (sufit tylko do renderu).
 * 2. Otwory (drzwi/okna) → dziury w ścianie-hoście, żadnych nowych powierzchni.
 * 3. Wnęki → dziura w ścianie + 5 powierzchni wnętrza.
 * 4. M3: ścianki boxów z rozwiązywaniem kontaktów.
 *
 * Recty otworów/wnęk są przycinane do granic ściany (edycja wymiarów pokoju
 * nie może wywrócić derywacji). V1: wnęki i otwory tylko na 4 ścianach pokoju;
 * hostowanie na ściankach działowych to punkt rozszerzenia.
 */
export function deriveSurfaces(project: Project): Surface[] {
  const surfaces = roomSurfaces(project.room)
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
    }
  }
  return surfaces
}
