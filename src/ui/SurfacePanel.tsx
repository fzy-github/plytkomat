import { useTranslation } from 'react-i18next'
import type { Surface } from '../geometry/surfaces'
import { newId } from '../model/ids'
import { useStore } from '../state/store'
import { surfaceLabel } from './surfaceLabel'

/** Panel wybranej powierzchni: kafelkuj całą / dodaj region częściowy. */
export function SurfacePanel({ surface }: { surface: Surface }) {
  const { t } = useTranslation()
  const project = useStore((s) => s.project)
  const addRegion = useStore((s) => s.addRegion)
  const select = useStore((s) => s.select)

  const firstType = project.tileTypes[0]
  const elementId = surface.source.elementId

  const createRegion = (whole: boolean) => {
    if (!firstType) return
    addRegion({
      id: newId(),
      surfaceId: surface.id,
      rect: whole
        ? { x: 0, y: 0, w: surface.width, h: surface.height }
        : {
            x: 0,
            y: 0,
            w: Math.min(100, surface.width),
            h: Math.min(100, surface.height),
          },
      tileTypeId: firstType.id,
    })
  }

  return (
    <section className="form-section">
      <h2>{t('surfacePanel.title')}</h2>
      <p className="hint">
        {surfaceLabel(surface, project, t)} · {surface.width}×{surface.height} cm
      </p>
      {elementId && (
        <button
          type="button"
          className="action-button"
          onClick={() => select({ kind: 'element', id: elementId })}
        >
          {t('surfacePanel.editElement')}
        </button>
      )}
      {firstType ? (
        <>
          <button type="button" className="action-button" onClick={() => createRegion(true)}>
            {t('surfacePanel.tileWhole')}
          </button>
          <button type="button" className="action-button" onClick={() => createRegion(false)}>
            {t('surfacePanel.addRegion')}
          </button>
        </>
      ) : (
        <p className="hint">{t('surfacePanel.needTileType')}</p>
      )}
    </section>
  )
}
