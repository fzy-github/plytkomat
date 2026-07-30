import { calculateProject } from '../calc/engine'
import type { CalcMode, ProjectCalcResult } from '../calc/types'
import { deriveSurfaces, type Surface } from '../geometry/surfaces'
import type { Project } from '../model/types'

let lastProject: Project | null = null
let lastSurfaces: Surface[] = []

/**
 * Derywacja powierzchni za memo po referencji projektu — scena, panele i
 * silnik obliczeń współdzielą jeden wynik; orbitowanie nic nie przelicza.
 */
export function getSurfaces(project: Project): Surface[] {
  if (project !== lastProject) {
    lastSurfaces = deriveSurfaces(project)
    lastProject = project
  }
  return lastSurfaces
}

let lastCalcProject: Project | null = null
let lastCalcMode: CalcMode | null = null
let lastResults: ProjectCalcResult | null = null

/** Wyniki obliczeń za memo po (projekt, tryb). */
export function getResults(project: Project, mode: CalcMode): ProjectCalcResult {
  if (project !== lastCalcProject || mode !== lastCalcMode || lastResults === null) {
    lastResults = calculateProject(project, getSurfaces(project), mode)
    lastCalcProject = project
    lastCalcMode = mode
  }
  return lastResults
}
