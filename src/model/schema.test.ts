import { describe, expect, it } from 'vitest'
import {
  createNiche,
  createOpening,
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
      tileTypes: [createTileType('Płytka', 0)],
    }
    project.regions = [
      {
        id: 'r1',
        surfaceId: 'wall:north',
        rect: { x: 0, y: 0, w: 100, h: 100 },
        tileTypeId: project.tileTypes[0].id,
      },
    ]
    const restored = migrateProject(JSON.parse(JSON.stringify(makeEnvelope(project))))
    expect(restored).toEqual(project)
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
