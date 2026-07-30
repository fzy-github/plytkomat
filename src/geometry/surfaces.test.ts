import { describe, expect, it } from 'vitest'
import { defaultProject } from '../model/defaults'
import type {
  BoxElement,
  NicheElement,
  OpeningElement,
  Project,
  RoomElement,
} from '../model/types'
import { deriveSurfaces, type Surface } from './surfaces'

// Pokój 300 (szer., X) × 200 (dł., Z) × 250 (wys., Y) — przybija konwencję
// orientacji: u od lewej do prawej patrząc z wnętrza, v w górę, normalna do wnętrza.
const project = { ...defaultProject(), room: { width: 300, length: 200, height: 250 } }

function withElements(...elements: RoomElement[]): Project {
  return { ...project, elements }
}

function surfaceOf(p: Project, id: string): Surface {
  const found = deriveSurfaces(p).find((s) => s.id === id)
  if (!found) throw new Error(`missing surface ${id}`)
  return found
}

function surface(id: string): Surface {
  return surfaceOf(project, id)
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

describe('deriveSurfaces — otwory (drzwi/okna)', () => {
  const door: OpeningElement = {
    id: 'door1',
    kind: 'opening',
    name: 'Drzwi',
    wall: 'north',
    rect: { x: 20, y: 0, w: 90, h: 205 },
  }

  it('drzwi robią dziurę w ścianie-hoście, zero nowych powierzchni', () => {
    const p = withElements(door)
    expect(deriveSurfaces(p)).toHaveLength(6)
    expect(surfaceOf(p, 'wall:north').holes).toEqual([{ x: 20, y: 0, w: 90, h: 205 }])
    expect(surfaceOf(p, 'wall:south').holes).toEqual([])
  })

  it('otwór wystający poza ścianę jest przycinany', () => {
    const p = withElements({ ...door, rect: { x: 250, y: 0, w: 90, h: 205 } })
    expect(surfaceOf(p, 'wall:north').holes).toEqual([{ x: 250, y: 0, w: 50, h: 205 }])
  })

  it('otwór całkowicie poza ścianą jest ignorowany', () => {
    const p = withElements({ ...door, rect: { x: 400, y: 0, w: 90, h: 205 } })
    expect(surfaceOf(p, 'wall:north').holes).toEqual([])
  })
})

describe('deriveSurfaces — wnęki', () => {
  const niche: NicheElement = {
    id: 'n1',
    kind: 'niche',
    name: 'Wnęka',
    wall: 'north',
    rect: { x: 100, y: 90, w: 60, h: 30 },
    depth: 10,
  }
  const p = withElements(niche)

  it('dziura w ścianie + 5 powierzchni wnętrza, wszystkie kafelkowalne', () => {
    const surfaces = deriveSurfaces(p)
    expect(surfaces).toHaveLength(11)
    expect(surfaceOf(p, 'wall:north').holes).toEqual([{ x: 100, y: 90, w: 60, h: 30 }])
    for (const face of ['back', 'left', 'right', 'bottom', 'top']) {
      const s = surfaceOf(p, `niche:n1:${face}`)
      expect(s.tileableByDefault).toBe(true)
      expect(s.source).toEqual({ type: 'element', elementId: 'n1', face })
    }
  })

  it('tył 60×30 cofnięty o głębokość, baza jak ściana', () => {
    const s = surfaceOf(p, 'niche:n1:back')
    expect(s.origin).toEqual({ x: 100, y: 90, z: -10 })
    expect(s.u).toEqual({ x: 1, y: 0, z: 0 })
    expect(s.v).toEqual({ x: 0, y: 1, z: 0 })
    expect(s.normal).toEqual({ x: 0, y: 0, z: 1 })
    expect(s.width).toBe(60)
    expect(s.height).toBe(30)
  })

  it('boki 10×30 — lewy patrzy w +u ściany, prawy w -u', () => {
    const left = surfaceOf(p, 'niche:n1:left')
    expect(left.origin).toEqual({ x: 100, y: 90, z: -10 })
    expect(left.u).toEqual({ x: 0, y: 0, z: 1 })
    expect(left.normal).toEqual({ x: 1, y: 0, z: 0 })
    expect(left.width).toBe(10)
    expect(left.height).toBe(30)

    const right = surfaceOf(p, 'niche:n1:right')
    expect(right.origin).toEqual({ x: 160, y: 90, z: 0 })
    expect(right.u).toEqual({ x: 0, y: 0, z: -1 })
    expect(right.normal).toEqual({ x: -1, y: 0, z: 0 })
    expect(right.width).toBe(10)
    expect(right.height).toBe(30)
  })

  it('półki 60×10 — dolna patrzy w górę, górna w dół', () => {
    const bottom = surfaceOf(p, 'niche:n1:bottom')
    expect(bottom.origin).toEqual({ x: 100, y: 90, z: -10 })
    expect(bottom.u).toEqual({ x: 1, y: 0, z: 0 })
    expect(bottom.v).toEqual({ x: 0, y: 0, z: 1 })
    expect(bottom.normal).toEqual({ x: 0, y: 1, z: 0 })
    expect(bottom.width).toBe(60)
    expect(bottom.height).toBe(10)

    const top = surfaceOf(p, 'niche:n1:top')
    expect(top.origin).toEqual({ x: 100, y: 120, z: -10 })
    expect(top.normal).toEqual({ x: 0, y: -1, z: 0 })
    expect(top.width).toBe(60)
    expect(top.height).toBe(10)
  })

  it('wnęka na ścianie wschodniej — baza przeliczona poprawnie', () => {
    // Ściana east: origin (300,0,0), u=+Z, normalna -X. Tył wnęki jest
    // cofnięty w -normalną, czyli w +X (w głąb ściany, poza pokój).
    const pe = withElements({ ...niche, id: 'n2', wall: 'east', rect: { x: 50, y: 100, w: 40, h: 20 }, depth: 8 })
    const back = surfaceOf(pe, 'niche:n2:back')
    expect(back.origin).toEqual({ x: 308, y: 100, z: 50 })
    expect(back.u).toEqual({ x: 0, y: 0, z: 1 })
    expect(back.normal).toEqual({ x: -1, y: 0, z: 0 })
  })
})

describe('deriveSurfaces — elementy box i rozwiązywanie kontaktów', () => {
  it('ścianka działowa 120×250×10 dobita do west: stłumiony koniec, pasek w ścianie, footprint w podłodze', () => {
    const partition: BoxElement = {
      id: 'p1',
      kind: 'partition',
      name: 'Ścianka',
      pos: { x: 0, y: 0, z: 60 },
      size: { x: 120, y: 250, z: 10 },
    }
    const p = withElements(partition)
    const surfaces = deriveSurfaces(p)

    // left (kontakt z west), bottom (podłoga) i top (ścianka na pełną
    // wysokość dotyka sufitu) stłumione → 3 ścianki.
    const faces = surfaces.filter((s) => s.id.startsWith('el:p1:')).map((s) => s.id)
    expect(faces.sort()).toEqual(['el:p1:back', 'el:p1:front', 'el:p1:right'])

    // Pasek 10×250 w ścianie zachodniej: lokalnie u=-Z od (0,0,L), więc x = L - (z+dz).
    expect(surfaceOf(p, 'wall:west').holes).toEqual([{ x: 200 - 70, y: 0, w: 10, h: 250 }])
    // Footprint 120×10 w podłodze (u=+X, v=+Z) i odcisk w suficie.
    expect(surfaceOf(p, 'floor').holes).toEqual([{ x: 0, y: 60, w: 120, h: 10 }])
    expect(surfaceOf(p, 'ceiling').holes).toEqual([{ x: 0, y: 60, w: 120, h: 10 }])

    // Czołowa ścianka (right, normalna +X) — baza jak ściana west (u=-Z).
    const right = surfaceOf(p, 'el:p1:right')
    expect(right.origin).toEqual({ x: 120, y: 0, z: 70 })
    expect(right.u).toEqual({ x: 0, y: 0, z: -1 })
    expect(right.normal).toEqual({ x: 1, y: 0, z: 0 })
    expect(right.width).toBe(10)
    expect(right.height).toBe(250)
  })

  it('zabudowa wanny 170×55×60 w narożniku: 2 kontakty ze ścianami + podłoga, top wyłączony → zostają 2 ścianki', () => {
    const tub: BoxElement = {
      id: 't1',
      kind: 'tubEnclosure',
      name: 'Wanna',
      pos: { x: 0, y: 0, z: 0 },
      size: { x: 170, y: 55, z: 60 },
      faces: { top: false },
    }
    const p = withElements(tub)
    const surfaces = deriveSurfaces(p)

    const faces = surfaces.filter((s) => s.id.startsWith('el:t1:')).map((s) => s.id)
    expect(faces.sort()).toEqual(['el:t1:front', 'el:t1:right'])

    // Kontakty: north (back 170×55), west (left 60×55), floor (170×60).
    expect(surfaceOf(p, 'wall:north').holes).toEqual([{ x: 0, y: 0, w: 170, h: 55 }])
    expect(surfaceOf(p, 'wall:west').holes).toEqual([{ x: 200 - 60, y: 0, w: 60, h: 55 }])
    expect(surfaceOf(p, 'floor').holes).toEqual([{ x: 0, y: 0, w: 170, h: 60 }])

    // Front zabudowy (normalna +Z): od lewej patrząc z pokoju.
    const front = surfaceOf(p, 'el:t1:front')
    expect(front.origin).toEqual({ x: 0, y: 0, z: 60 })
    expect(front.u).toEqual({ x: 1, y: 0, z: 0 })
    expect(front.width).toBe(170)
    expect(front.height).toBe(55)
  })

  it('murek wolnostojący na środku: 5 ścianek (bottom w podłodze), top emitowany', () => {
    const box: BoxElement = {
      id: 'b1',
      kind: 'box',
      name: 'Murek',
      pos: { x: 100, y: 0, z: 80 },
      size: { x: 60, y: 120, z: 25 },
      faces: { top: true },
    }
    const p = withElements(box)
    const faces = deriveSurfaces(p)
      .filter((s) => s.id.startsWith('el:b1:'))
      .map((s) => s.id)
    expect(faces.sort()).toEqual([
      'el:b1:back',
      'el:b1:front',
      'el:b1:left',
      'el:b1:right',
      'el:b1:top',
    ])
    expect(surfaceOf(p, 'floor').holes).toEqual([{ x: 100, y: 80, w: 60, h: 25 }])

    const top = surfaceOf(p, 'el:b1:top')
    expect(top.origin).toEqual({ x: 100, y: 120, z: 80 })
    expect(top.normal).toEqual({ x: 0, y: 1, z: 0 })
    expect(top.width).toBe(60)
    expect(top.height).toBe(25)
  })

  it('box sięgający sufitu tłumi top i wybija dziurę w suficie', () => {
    const column: BoxElement = {
      id: 'c1',
      kind: 'box',
      name: 'Pion',
      pos: { x: 280, y: 0, z: 0 },
      size: { x: 20, y: 250, z: 20 },
    }
    const p = withElements(column)
    const faces = deriveSurfaces(p)
      .filter((s) => s.id.startsWith('el:c1:'))
      .map((s) => s.id)
    expect(faces).not.toContain('el:c1:top')
    expect(surfaceOf(p, 'ceiling').holes).toEqual([{ x: 280, y: 0, w: 20, h: 20 }])
  })
})
