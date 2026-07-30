import { describe, expect, it } from 'vitest'
import { defaultProject } from '../model/defaults'
import { deriveSurfaces, type Surface } from './surfaces'

// Pokój 300 (szer., X) × 200 (dł., Z) × 250 (wys., Y) — przybija konwencję
// orientacji: u od lewej do prawej patrząc z wnętrza, v w górę, normalna do wnętrza.
const project = { ...defaultProject(), room: { width: 300, length: 200, height: 250 } }

function surface(id: string): Surface {
  const found = deriveSurfaces(project).find((s) => s.id === id)
  if (!found) throw new Error(`missing surface ${id}`)
  return found
}

describe('deriveSurfaces — pusty pokój', () => {
  it('zwraca 6 powierzchni bez dziur', () => {
    const surfaces = deriveSurfaces(project)
    expect(surfaces.map((s) => s.id).sort()).toEqual(
      ['ceiling', 'floor', 'wall:east', 'wall:north', 'wall:south', 'wall:west'].sort(),
    )
    for (const s of surfaces) expect(s.holes).toEqual([])
  })

  it('wall:north — origin (0,0,0), u=+X, v=+Y, normalna +Z', () => {
    const s = surface('wall:north')
    expect(s.origin).toEqual({ x: 0, y: 0, z: 0 })
    expect(s.u).toEqual({ x: 1, y: 0, z: 0 })
    expect(s.v).toEqual({ x: 0, y: 1, z: 0 })
    expect(s.normal).toEqual({ x: 0, y: 0, z: 1 })
    expect(s.width).toBe(300)
    expect(s.height).toBe(250)
  })

  it('wall:east — origin (W,0,0), u=+Z, normalna -X', () => {
    const s = surface('wall:east')
    expect(s.origin).toEqual({ x: 300, y: 0, z: 0 })
    expect(s.u).toEqual({ x: 0, y: 0, z: 1 })
    expect(s.normal).toEqual({ x: -1, y: 0, z: 0 })
    expect(s.width).toBe(200)
  })

  it('wall:south — origin (W,0,L), u=-X, normalna -Z', () => {
    const s = surface('wall:south')
    expect(s.origin).toEqual({ x: 300, y: 0, z: 200 })
    expect(s.u).toEqual({ x: -1, y: 0, z: 0 })
    expect(s.normal).toEqual({ x: 0, y: 0, z: -1 })
    expect(s.width).toBe(300)
  })

  it('wall:west — origin (0,0,L), u=-Z, normalna +X', () => {
    const s = surface('wall:west')
    expect(s.origin).toEqual({ x: 0, y: 0, z: 200 })
    expect(s.u).toEqual({ x: 0, y: 0, z: -1 })
    expect(s.normal).toEqual({ x: 1, y: 0, z: 0 })
    expect(s.width).toBe(200)
  })

  it('floor — origin (0,0,0), u=+X, v=+Z, normalna +Y, kafelkowalna', () => {
    const s = surface('floor')
    expect(s.origin).toEqual({ x: 0, y: 0, z: 0 })
    expect(s.u).toEqual({ x: 1, y: 0, z: 0 })
    expect(s.v).toEqual({ x: 0, y: 0, z: 1 })
    expect(s.normal).toEqual({ x: 0, y: 1, z: 0 })
    expect(s.width).toBe(300)
    expect(s.height).toBe(200)
    expect(s.tileableByDefault).toBe(true)
  })

  it('ceiling — origin (0,H,0), normalna -Y, niekafelkowalny', () => {
    const s = surface('ceiling')
    expect(s.origin).toEqual({ x: 0, y: 250, z: 0 })
    expect(s.normal).toEqual({ x: 0, y: -1, z: 0 })
    expect(s.tileableByDefault).toBe(false)
  })
})
