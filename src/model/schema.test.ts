import { describe, expect, it } from 'vitest'
import {
  createNiche,
  createOpening,
  createPanelType,
  createPartition,
  createTileType,
  createTubEnclosure,
  defaultProject,
} from './defaults'
import { makeEnvelope, migrateProject } from './schema'
import type { Project } from './types'

describe('schema / migracja', () => {
  it('round-trip: pełny projekt przechodzi przez kopertę bez zmian', () => {
    const project: Project = {
      ...defaultProject(),
      elements: [
        createNiche('Wnęka'),
        createOpening('Drzwi'),
        createPartition('Ścianka'),
        createTubEnclosure('Wanna'),
      ],
      tileTypes: [createTileType('Płytka', 0), createPanelType('Panel', 1)],
    }
    project.regions = [
      {
        id: 'r1',
        surfaceId: 'wall:north',
        rect: { x: 0, y: 0, w: 100, h: 100 },
        tileTypeId: project.tileTypes[0].id,
      },
      {
        id: 'r2',
        surfaceId: 'floor',
        rect: { x: 0, y: 0, w: 150, h: 100 },
        tileTypeId: project.tileTypes[1].id,
        direction: 'v',
      },
    ]
    const restored = migrateProject(JSON.parse(JSON.stringify(makeEnvelope(project))))
    expect(restored).toEqual(project)
  })

  it('migruje kopertę v1: dokłada kind=tile i domyślne pola panelowe', () => {
    // Literalna fixture v1 — dokładnie kształt sprzed M8 (bez kind, bez panel*).
    const v1 = {
      schemaVersion: 1,
      savedAt: '2026-07-29T00:00:00.000Z',
      project: {
        schemaVersion: 1,
        name: 'Łazienka',
        room: { width: 200, length: 250, height: 250 },
        elements: [],
        tileTypes: [
          {
            id: 'tt1',
            name: 'Płytka 1',
            width: 60,
            height: 30,
            color: '#e07a5f',
            rotatable: true,
          },
        ],
        regions: [
          {
            id: 'r1',
            surfaceId: 'wall:north',
            rect: { x: 0, y: 0, w: 100, h: 100 },
            tileTypeId: 'tt1',
          },
        ],
        settings: { groutWidth: 0.2, wastePercent: 10, minOffcut: 5 },
      },
    }
    const migrated = migrateProject(v1)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.tileTypes[0].kind).toBe('tile')
    expect(migrated.tileTypes[0].piecesPerPackage).toBeUndefined()
    expect(migrated.settings.panelMinStart).toBe(30)
    expect(migrated.settings.panelMinStagger).toBe(30)
    expect(migrated.regions[0]).toEqual(v1.project.regions[0])
  })

  it('odrzuca piecesPerPackage < 1 w v2', () => {
    const bad = makeEnvelope({
      ...defaultProject(),
      tileTypes: [{ ...createTileType('Płytka', 0), piecesPerPackage: 0 }],
    })
    expect(() => migrateProject(JSON.parse(JSON.stringify(bad)))).toThrow()
  })

  it('odrzuca nieznaną wersję schematu', () => {
    expect(() => migrateProject({ schemaVersion: 99, project: {} })).toThrow(/schemaVersion/)
  })

  it('odrzuca uszkodzony projekt (ujemne wymiary pokoju)', () => {
    const bad = makeEnvelope({ ...defaultProject(), room: { width: -1, length: 250, height: 250 } })
    expect(() => migrateProject(JSON.parse(JSON.stringify(bad)))).toThrow()
  })

  it('odrzuca payload niebędący kopertą', () => {
    expect(() => migrateProject('garbage')).toThrow()
    expect(() => migrateProject({ foo: 'bar' })).toThrow()
  })
})
