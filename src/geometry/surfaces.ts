import type { Project, Rect, RoomDimensions, SurfaceId, WallId } from '../model/types'
import { vec3, type Vec3 } from './vec'

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
 * Wyprowadza wszystkie płaskie powierzchnie projektu.
 *
 * M1: tylko 6 powierzchni pokoju.
 * M2: + dziury z otworów/wnęk i powierzchnie wnętrz wnęk.
 * M3: + ścianki boxów z rozwiązywaniem kontaktów.
 */
export function deriveSurfaces(project: Project): Surface[] {
  return roomSurfaces(project.room)
}
