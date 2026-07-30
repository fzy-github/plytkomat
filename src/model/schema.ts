import { z } from 'zod'
import type { Project } from './types'

/**
 * Walidacja niezaufanego wejścia (import pliku, localStorage) + wersjonowanie:
 * switch po schemaVersion w migrateProject to mechanizm migracji na przyszłość.
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

const tileTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  color: z.string(),
  rotatable: z.boolean(),
})

const regionSchema = z.object({
  id: z.string(),
  surfaceId: z.string(),
  rect: rectSchema,
  tileTypeId: z.string(),
  name: z.string().optional(),
})

const projectSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string(),
  room: z.object({
    width: z.number().positive(),
    length: z.number().positive(),
    height: z.number().positive(),
  }),
  elements: z.array(z.union([boxElementSchema, nicheElementSchema, openingElementSchema])),
  tileTypes: z.array(tileTypeSchema),
  regions: z.array(regionSchema),
  settings: z.object({
    groutWidth: z.number().min(0),
    wastePercent: z.number().min(0),
    minOffcut: z.number().min(0),
  }),
})

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

/** Parsuje kopertę {schemaVersion, savedAt, project}; rzuca przy złych danych. */
export function migrateProject(raw: unknown): Project {
  const envelope = envelopeSchema.parse(raw)
  switch (envelope.schemaVersion) {
    case 1:
      return projectSchema.parse(envelope.project) as Project
    default:
      throw new Error(`Unsupported schemaVersion: ${envelope.schemaVersion}`)
  }
}
