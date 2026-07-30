import { create } from 'zustand'
import { defaultProject } from '../model/defaults'
import type { Project, RoomDimensions } from '../model/types'

interface StoreState {
  project: Project
  setProjectName: (name: string) => void
  setRoom: (patch: Partial<RoomDimensions>) => void
}

export const useStore = create<StoreState>((set) => ({
  project: defaultProject(),
  setProjectName: (name) => set((s) => ({ project: { ...s.project, name } })),
  setRoom: (patch) =>
    set((s) => ({ project: { ...s.project, room: { ...s.project.room, ...patch } } })),
}))
