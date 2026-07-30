import { z } from 'zod'
import { DEFAULT_SETTINGS } from './defaults'
import type { Project } from './types'

/**
 * Walidacja niezaufanego wejścia (import pliku, localStorage) + wersjonowanie:
 * switch po schemaVersion w migrateProject to mechanizm migracji. Schemat v1
 * jest zamrożony verbatim — parse-then-upgrade.
 */

const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

const wallIdSchema = z.enum(['north', 'south', 'east', 'west'])
const vec3Schema = z.object({ x: z.number(), y: z.number(), z: z.number() })

const boxElementSchema = z.object({
  id: z.string(),
  kind: z.enum(['partition', 'tubEnclosure', 'box']),
  name: z.string(),
  pos: vec3Schema,
  size: vec3Schema,
  faces: z.record(z.string(), z.boolean()).optional(),
})

const nicheElementSchema = z.object({
  id: z.string(),
  kind: z.literal('niche'),
  name: z.string(),
  wall: wallIdSchema,
  rect: rectSchema,
  depth: z.number().positive(),
})

const openingElementSchema = z.object({
  id: z.string(),
  kind: z.literal('opening'),
  name: z.string(),
  wall: wallIdSchema,
  rect: rectSchema,
})

const elementsSchema = z.array(
  z.union([boxElementSchema, nicheElementSchema, openingElementSchema]),
)

const roomSchema = z.object({
  width: z.number().positive(),
  length: z.number().positive(),
  height: z.number().positive(),
})

// ---------------------------------------------------------------- schemat v1

const tileTypeSchemaV1 = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string(),
  rotatable: z.boolean(),
})

const regionSchemaV1 = z.object({
  id: z.string(),
  surfaceId: z.string(),
  rect: rectSchema,
  tileTypeId: z.string(),
  name: z.string().optional(),
})

const settingsSchemaV1 = z.object({
  groutWidth: z.number().min(0),
  wastePercent: z.number().min(0),
  minOffcut: z.number().min(0),
})

const projectSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  name: z.string(),
  room: roomSchema,
  elements: elementsSchema,
  tileTypes: z.array(tileTypeSchemaV1),
  regions: z.array(regionSchemaV1),
  settings: settingsSchemaV1,
})

// ---------------------------------------------------------------- schemat v2

const tileTypeSchemaV2 = tileTypeSchemaV1.extend({
  kind: z.enum(['tile', 'panel']),
  piecesPerPackage: z.number().int().min(1).optional(),
})

const regionSchemaV2 = regionSchemaV1.extend({
  direction: z.enum(['u', 'v']).optional(),
})

const settingsSchemaV2 = settingsSchemaV1.extend({
  panelMinStart: z.number().min(0),
  panelMinStagger: z.number().min(0),
})

const projectSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  name: z.string(),
  room: roomSchema,
  elements: elementsSchema,
  tileTypes: z.array(tileTypeSchemaV2),
  regions: z.array(regionSchemaV2),
  settings: settingsSchemaV2,
})

// ------------------------------------------------------------------ koperta

const envelopeSchema = z.object({
  schemaVersion: z.number(),
  savedAt: z.string().optional(),
  project: z.unknown(),
})

export interface ProjectEnvelope {
  schemaVersion: number
  savedAt: string
  project: Project
}

export function makeEnvelope(project: Project): ProjectEnvelope {
  return { schemaVersion: project.schemaVersion, savedAt: new Date().toISOString(), project }
}

function upgradeV1(p: z.infer<typeof projectSchemaV1>): Project {
  return {
    ...p,
    schemaVersion: 2,
    tileTypes: p.tileTypes.map((tt) => ({ ...tt, kind: 'tile' as const })),
    settings: {
      ...p.settings,
      panelMinStart: DEFAULT_SETTINGS.panelMinStart,
      panelMinStagger: DEFAULT_SETTINGS.panelMinStagger,
    },
  } as Project
}

/** Parsuje kopertę {schemaVersion, savedAt, project}; rzuca przy złych danych. */
export function migrateProject(raw: unknown): Project {
  const envelope = envelopeSchema.parse(raw)
  switch (envelope.schemaVersion) {
    case 1:
      return upgradeV1(projectSchemaV1.parse(envelope.project))
    case 2:
      return projectSchemaV2.parse(envelope.project) as Project
    default:
      throw new Error(`Unsupported schemaVersion: ${envelope.schemaVersion}`)
  }
}
