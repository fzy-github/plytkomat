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
