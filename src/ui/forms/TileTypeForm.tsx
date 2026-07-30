import { useTranslation } from 'react-i18next'
import type { TileType } from '../../model/types'
import { useStore } from '../../state/store'
import { NumberField } from '../NumberField'

export function TileTypeForm({ tileType }: { tileType: TileType }) {
  const { t } = useTranslation()
  const updateTileType = useStore((s) => s.updateTileType)
  const isPanel = tileType.kind === 'panel'

  return (
    <section className="form-section">
      <h2>{t('tiles.edit')}</h2>
      <label className="field">
        <span>{t('element.name')}</span>
        <input
          value={tileType.name}
          onChange={(e) => updateTileType(tileType.id, { name: e.target.value })}
        />
      </label>
      <label className="field">
        <span>{t('tiles.kind')}</span>
        <select
          value={tileType.kind}
          onChange={(e) =>
            updateTileType(tileType.id, { kind: e.target.value as TileType['kind'] })
          }
        >
          <option value="tile">{t('tiles.kindTile')}</option>
          <option value="panel">{t('tiles.kindPanel')}</option>
        </select>
      </label>
      <NumberField
        label={isPanel ? t('tiles.panelLength') : t('tiles.width')}
        value={tileType.width}
        min={1}
        max={300}
        step={0.1}
        onChange={(width) => updateTileType(tileType.id, { width })}
      />
      <NumberField
        label={isPanel ? t('tiles.panelWidth') : t('tiles.height')}
        value={tileType.height}
        min={1}
        max={300}
        step={0.1}
        onChange={(height) => updateTileType(tileType.id, { height })}
      />
      <label className="field">
        <span>{t('tiles.color')}</span>
        <input
          type="color"
          value={tileType.color}
          onChange={(e) => updateTileType(tileType.id, { color: e.target.value })}
        />
      </label>
      <NumberField
        label={t('tiles.piecesPerPackage')}
        value={tileType.piecesPerPackage ?? 0}
        min={0}
        max={100}
        step={1}
        unit={t('tiles.piecesUnit')}
        onChange={(v) =>
          updateTileType(tileType.id, {
            piecesPerPackage: v >= 1 ? Math.round(v) : undefined,
          })
        }
      />
      {!isPanel && (
        <label className="face-toggle">
          <input
            type="checkbox"
            checked={tileType.rotatable}
            onChange={(e) => updateTileType(tileType.id, { rotatable: e.target.checked })}
          />
          <span>{t('tiles.rotatable')}</span>
        </label>
      )}
    </section>
  )
}
