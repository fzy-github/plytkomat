import { useTranslation } from 'react-i18next'
import { getSurfaces } from '../state/selectors'
import { useStore } from '../state/store'
import { surfaceLabel } from './surfaceLabel'

export function RegionList() {
  const { t } = useTranslation()
  const project = useStore((s) => s.project)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const removeRegion = useStore((s) => s.removeRegion)
  const surfaces = getSurfaces(project)
  const surfaceById = new Map(surfaces.map((s) => [s.id, s]))
  const typeById = new Map(project.tileTypes.map((tt) => [tt.id, tt]))

  return (
    <section className="form-section">
      <h2>{t('regions.title')}</h2>
      {project.regions.length === 0 && <p className="hint">{t('regions.empty')}</p>}
      <ul className="element-list">
        {project.regions.map((r) => {
          const surface = surfaceById.get(r.surfaceId)
          const tileType = typeById.get(r.tileTypeId)
          if (!surface || !tileType) return null
          const active = selection?.kind === 'region' && selection.id === r.id
          return (
            <li key={r.id} className={active ? 'active' : ''}>
              <button
                type="button"
                className="element-row"
                onClick={() => select({ kind: 'region', id: r.id })}
              >
                <span className="element-name">
                  <span className="color-chip" style={{ background: tileType.color }} />
                  {tileType.name}
                </span>
                <span className="element-kind">{surfaceLabel(surface, project, t)}</span>
              </button>
              <button
                type="button"
                className="element-delete"
                onClick={() => removeRegion(r.id)}
                aria-label={t('common.delete')}
                title={t('common.delete')}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
