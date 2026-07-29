import { create } from 'zustand'
import { defaultProject } from '../model/defaults'
import type { Id, Project, RoomDimensions, RoomElement } from '../model/types'

export type Selection = {
  kind: 'element' | 'surface' | 'region' | 'tileType'
  id: string
} | null

interface StoreState {
  project: Project
  selection: Selection
  setProjectName: (name: string) => void
  setRoom: (patch: Partial<RoomDimensions>) => void
  select: (selection: Selection) => void
  addElement: (element: RoomElement) => void
  updateElement: (id: Id, update: (el: RoomElement) => RoomElement) => void
  removeElement: (id: Id) => void
}

export const useStore = create<StoreState>((set) => ({
  project: defaultProject(),
  selection: null,
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
  setRoom: (patch) =>
    set((s) => ({ project: { ...s.project, room: { ...s.project.room, ...patch } } })),
  select: (selection) => set({ selection }),
  addElement: (element) =>
    set((s) => ({
      project: { ...s.project, elements: [...s.project.elements, element] },
      selection: { kind: 'element', id: element.id },
    })),
  updateElement: (id, update) =>
    set((s) => ({
      project: {
        ...s.project,
        elements: s.project.elements.map((el) => (el.id === id ? update(el) : el)),
      },
    })),
  // Kasowanie elementu kaskadowo usuwa regiony na jego powierzchniach —
  // deterministyczne id powierzchni zawierają id elementu.
  removeElement: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        elements: s.project.elements.filter((el) => el.id !== id),
        regions: s.project.regions.filter((r) => !r.surfaceId.includes(id)),
      },
      selection:
        s.selection?.kind === 'element' && s.selection.id === id ? null : s.selection,
    })),
}))
