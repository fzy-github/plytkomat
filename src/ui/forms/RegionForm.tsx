import { useTranslation } from 'react-i18next'
import type { Surface } from '../../geometry/surfaces'
import type { TileRegion } from '../../model/types'
import { useStore } from '../../state/store'
import { NumberField } from '../NumberField'
import { surfaceLabel } from '../surfaceLabel'

export function RegionForm({ region, surface }: { region: TileRegion; surface: Surface }) {
  const { t } = useTranslation()
  const project = useStore((s) => s.project)
  const updateRegion = useStore((s) => s.updateRegion)
  const removeRegion = useStore((s) => s.removeRegion)

  const patchRect = (next: Partial<TileRegion['rect']>) =>
    updateRegion(region.id, { rect: { ...region.rect, ...next } })

  return (
    <section className="form-section">
      <h2>{t('region.title')}</h2>
      <p className="hint">{surfaceLabel(surface, project, t)}</p>
      <label className="field">
        <span>{t('region.tileType')}</span>
        <select
          value={region.tileTypeId}
          onChange={(e) => updateRegion(region.id, { tileTypeId: e.target.value })}
        >
          {project.tileTypes.map((tt) => (
            <option key={tt.id} value={tt.id}>
              {tt.name}
            </option>
          ))}
        </select>
      </label>
      <NumberField
        label={t('region.x')}
        value={region.rect.x}
        min={0}
        max={surface.width}
        onChange={(x) => patchRect({ x })}
      />
      <NumberField
        label={t('region.y')}
        value={region.rect.y}
        min={0}
        max={surface.height}
        onChange={(y) => patchRect({ y })}
      />
      <NumberField
        label={t('region.width')}
        value={region.rect.w}
        min={1}
        max={surface.width}
        onChange={(w) => patchRect({ w })}
      />
      <NumberField
        label={t('region.height')}
        value={region.rect.h}
        min={1}
        max={surface.height}
        onChange={(h) => patchRect({ h })}
      />
      <button type="button" className="action-button danger" onClick={() => removeRegion(region.id)}>
        {t('common.delete')}
      </button>
    </section>
  )
}
