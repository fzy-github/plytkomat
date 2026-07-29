import { newId } from './ids'
import type { NicheElement, OpeningElement, Project, Settings } from './types'

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
