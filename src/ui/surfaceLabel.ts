import type { TFunction } from 'i18next'
import type { Surface } from '../geometry/surfaces'
import type { Project } from '../model/types'

/** Czytelna etykieta powierzchni: "Ściana: Północna", "Wanna — Przód" itd. */
export function surfaceLabel(surface: Surface, project: Project, t: TFunction): string {
  if (surface.id === 'floor') return t('surface.floor')
  if (surface.id === 'ceiling') return t('surface.ceiling')
  if (surface.id.startsWith('wall:')) {
    return `${t('surface.wall')}: ${t(`walls.${surface.id.slice(5)}`)}`
  }
  const el = project.elements.find((e) => e.id === surface.source.elementId)
  const face = surface.source.face ? t(`face.${surface.source.face}`) : surface.id
  return el ? `${el.name} — ${face}` : surface.id
}
