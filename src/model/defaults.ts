import type { Project, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  groutWidth: 0.2,
  wastePercent: 10,
  minOffcut: 5,
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
