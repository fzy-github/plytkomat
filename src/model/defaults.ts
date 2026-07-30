import { newId } from './ids'
import type {
  BoxElement,
  NicheElement,
  OpeningElement,
  Project,
  Settings,
  TileType,
} from './types'

export const DEFAULT_SETTINGS: Settings = {
  groutWidth: 0.2,
  wastePercent: 10,
  minOffcut: 5,
  panelMinStart: 30,
  panelMinStagger: 30,
}

/** Domyślne wymiary z palety — nazwę (zależną od języka) podaje wołający. */
export function createNiche(name: string): NicheElement {
  return {
    id: newId(),
    kind: 'niche',
    name,
    wall: 'north',
    rect: { x: 70, y: 90, w: 60, h: 30 },
    depth: 10,
  }
}

export function createOpening(name: string): OpeningElement {
  return {
    id: newId(),
    kind: 'opening',
    name,
    wall: 'north',
    rect: { x: 20, y: 0, w: 90, h: 205 },
  }
}

/** Ścianka działowa dobita do ściany zachodniej, biegnąca w głąb pokoju. */
export function createPartition(name: string): BoxElement {
  return {
    id: newId(),
    kind: 'partition',
    name,
    pos: { x: 0, y: 0, z: 100 },
    size: { x: 120, y: 250, z: 10 },
  }
}

/** Zabudowa wanny w narożniku północno-zachodnim; top=false — tam leży wanna. */
export function createTubEnclosure(name: string): BoxElement {
  return {
    id: newId(),
    kind: 'tubEnclosure',
    name,
    pos: { x: 0, y: 0, z: 0 },
    size: { x: 170, y: 60, z: 75 },
    faces: { top: false },
  }
}

/** Ogólna zabudowa (np. stelaż WC / piony) — murek do połowy wysokości. */
export function createBox(name: string): BoxElement {
  return {
    id: newId(),
    kind: 'box',
    name,
    pos: { x: 0, y: 0, z: 0 },
    size: { x: 60, y: 120, z: 25 },
  }
}

/** Paleta kolorów wizualizacji — kolejne typy płytek dostają kolejne kolory. */
export const TILE_COLORS = ['#e07a5f', '#3d9970', '#5b8cff', '#f2cc8f', '#9b5de5', '#00b4d8']

export function createTileType(name: string, index: number): TileType {
  return {
    id: newId(),
    kind: 'tile',
    name,
    width: 60,
    height: 30,
    color: TILE_COLORS[index % TILE_COLORS.length],
    rotatable: true,
  }
}

/** Typowy panel: 138×19.3 cm (~0.266 m²/deska), 8 szt./paczka ≈ 2.13 m². */
export function createPanelType(name: string, index: number): TileType {
  return {
    id: newId(),
    kind: 'panel',
    name,
    width: 138,
    height: 19.3,
    color: TILE_COLORS[index % TILE_COLORS.length],
    rotatable: false,
    piecesPerPackage: 8,
  }
}

export function defaultProject(): Project {
  return {
    schemaVersion: 2,
    name: 'Łazienka',
    room: { width: 200, length: 250, height: 250 },
    elements: [],
    tileTypes: [],
    regions: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}
