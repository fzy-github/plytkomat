import { create } from 'zustand'
import { defaultProject } from '../model/defaults'
import type {
  Id,
  Project,
  RoomDimensions,
  RoomElement,
  Settings,
  TileRegion,
  TileType,
} from '../model/types'

import type { CalcMode } from '../calc/types'

export type Selection = {
  kind: 'element' | 'surface' | 'region' | 'tileType'
  id: string
} | null

interface StoreState {
  project: Project
  selection: Selection
  /** Id elementu pod kursorem w scenie 3D. */
  hover: string | null
  ui: { calcMode: CalcMode; resultsOpen: boolean }
  setCalcMode: (calcMode: CalcMode) => void
  toggleResults: () => void
  setProjectName: (name: string) => void
  setRoom: (patch: Partial<RoomDimensions>) => void
  updateSettings: (patch: Partial<Settings>) => void
  select: (selection: Selection) => void
  setHover: (id: string | null) => void
  addElement: (element: RoomElement) => void
  updateElement: (id: Id, update: (el: RoomElement) => RoomElement) => void
  removeElement: (id: Id) => void
  addTileType: (tileType: TileType) => void
  updateTileType: (id: Id, patch: Partial<TileType>) => void
  removeTileType: (id: Id) => void
  addRegion: (region: TileRegion) => void
  updateRegion: (id: Id, patch: Partial<TileRegion>) => void
  removeRegion: (id: Id) => void
}

export const useStore = create<StoreState>((set) => ({
  project: defaultProject(),
  selection: null,
  hover: null,
  ui: { calcMode: 'simple', resultsOpen: true },
  setCalcMode: (calcMode) => set((s) => ({ ui: { ...s.ui, calcMode } })),
  toggleResults: () => set((s) => ({ ui: { ...s.ui, resultsOpen: !s.ui.resultsOpen } })),
  setHover: (hover) => set({ hover }),
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
  setRoom: (patch) =>
    set((s) => ({ project: { ...s.project, room: { ...s.project.room, ...patch } } })),
  updateSettings: (patch) =>
    set((s) => ({
      project: { ...s.project, settings: { ...s.project.settings, ...patch } },
    })),
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
  addTileType: (tileType) =>
    set((s) => ({
      project: { ...s.project, tileTypes: [...s.project.tileTypes, tileType] },
      selection: { kind: 'tileType', id: tileType.id },
    })),
  updateTileType: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        tileTypes: s.project.tileTypes.map((tt) => (tt.id === id ? { ...tt, ...patch } : tt)),
      },
    })),
  // Kasowanie typu płytki kaskadowo usuwa regiony, które go używają.
  removeTileType: (id) =>
    set((s) => ({
      project: {
        ...s.project,
        tileTypes: s.project.tileTypes.filter((tt) => tt.id !== id),
        regions: s.project.regions.filter((r) => r.tileTypeId !== id),
      },
      selection:
        s.selection?.kind === 'tileType' && s.selection.id === id ? null : s.selection,
    })),
  addRegion: (region) =>
    set((s) => ({
      project: { ...s.project, regions: [...s.project.regions, region] },
      selection: { kind: 'region', id: region.id },
    })),
  updateRegion: (id, patch) =>
    set((s) => ({
      project: {
        ...s.project,
        regions: s.project.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })),
  removeRegion: (id) =>
    set((s) => ({
      project: { ...s.project, regions: s.project.regions.filter((r) => r.id !== id) },
      selection:
        s.selection?.kind === 'region' && s.selection.id === id ? null : s.selection,
    })),
}))
