import { newId } from './ids'
import type { BoxElement, NicheElement, OpeningElement, Project, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  groutWidth: 0.2,
  wastePercent: 10,
  minOffcut: 5,
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

export function defaultProject(): Project {
  return {
    schemaVersion: 1,
    name: 'Łazienka',
    room: { width: 200, length: 250, height: 250 },
    elements: [],
    tileTypes: [],
    regions: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}
