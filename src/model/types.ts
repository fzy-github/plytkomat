/**
 * Model domenowy Płytkomatu — 2D-first, scena 3D jest pochodną.
 *
 * Jednostki: centymetry w całym modelu (fuga 2 mm = 0.2 cm).
 * Układ współrzędnych pokoju (prawoskrętny, zgodny z three.js):
 * origin w narożniku podłogi, X = szerokość, Y = wysokość (up), Z = długość.
 * Ściany mają stałe id: north (z=0), south (z=length), west (x=0), east (x=width).
 */

export type Id = string

export type WallId = 'north' | 'south' | 'east' | 'west'

export type BoxFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'

/** Prostokąt w lokalnym układzie 2D powierzchni (cm). */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface RoomDimensions {
  width: number
  length: number
  height: number
}

/**
 * Ścianka działowa, zabudowa wanny i zabudowa ogólna to jeden prymityw —
 * osiowo wyrównany box. `kind` wpływa tylko na domyślne wymiary, domyślnie
 * kafelkowane ścianki i etykietę w palecie.
 */
export interface BoxElement {
  id: Id
  kind: 'partition' | 'tubEnclosure' | 'box'
  name: string
  pos: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
  /** Nadpisania kafelkowalności ścianek; tubEnclosure: top=false (tam leży wanna). */
  faces?: Partial<Record<BoxFace, boolean>>
}

/** Wnęka w ścianie pokoju: dziura w ścianie + 5 powierzchni wnętrza. */
export interface NicheElement {
  id: Id
  kind: 'niche'
  name: string
  wall: WallId
  /** W lokalnych 2D współrzędnych ściany (x od lewej patrząc z wnętrza, y od podłogi). */
  rect: Rect
  depth: number
}

/** Drzwi / okno: otwór w ścianie, nigdy nie kafelkowany (ościeża poza zakresem v1). */
export interface OpeningElement {
  id: Id
  kind: 'opening'
  name: string
  wall: WallId
  rect: Rect
}

export type RoomElement = BoxElement | NicheElement | OpeningElement

/** Typ materiału: płytka (siatka + fuga) albo panel podłogowy (rzędy z przewiązką). */
export interface TileType {
  id: Id
  name: string
  kind: 'tile' | 'panel'
  /** Płytka: szerokość. Panel: DŁUGOŚĆ deski (wzdłuż kierunku układania). */
  width: number
  /** Płytka: wysokość. Panel: SZEROKOŚĆ deski (wysokość rzędu). */
  height: number
  /** Kolor wizualizacji regionów w 3D. */
  color: string
  /** Tylko płytki: false dla kierunkowych — blokuje rotację 90° ścinek. Panele ignorują. */
  rotatable: boolean
  /** Sztuk w paczce; undefined = sprzedaż na sztuki. Dotyczy obu rodzajów. */
  piecesPerPackage?: number
}

/** Deterministyczny identyfikator powierzchni, np. 'wall:north', 'floor', 'niche:<id>:back'. */
export type SurfaceId = string

export interface TileRegion {
  id: Id
  surfaceId: SurfaceId
  /** W lokalnych współrzędnych powierzchni. */
  rect: Rect
  tileTypeId: Id
  name?: string
  /** Kierunek desek (tylko panele): 'u' = wzdłuż osi u powierzchni (domyślne), 'v' = wzdłuż v. */
  direction?: 'u' | 'v'
}

export interface Settings {
  /** Szerokość fugi w cm (tylko płytki; panele click nie mają fugi). */
  groutWidth: number
  /** Zapas w %: w trybie prostym wlicza docinki, w trybie układu — rezerwa na stłuczenia. */
  wastePercent: number
  /** Najmniejszy wymiar ścinki płytki (cm) nadającej się do ponownego użycia. */
  minOffcut: number
  /** Panele: minimalna długość kawałka rozpoczynającego rząd/segment (cm). */
  panelMinStart: number
  /** Panele: minimalne przesunięcie styków między sąsiednimi rzędami (cm). */
  panelMinStagger: number
}

export interface Project {
  schemaVersion: 2
  name: string
  room: RoomDimensions
  elements: RoomElement[]
  tileTypes: TileType[]
  regions: TileRegion[]
  settings: Settings
}
