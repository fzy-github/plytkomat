import { useTranslation } from 'react-i18next'
import { createTileType } from '../model/defaults'
import { useStore } from '../state/store'

export function TileTypeList() {
  const { t } = useTranslation()
  const tileTypes = useStore((s) => s.project.tileTypes)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const addTileType = useStore((s) => s.addTileType)
  const removeTileType = useStore((s) => s.removeTileType)

  return (
    <section className="form-section">
      <h2>{t('tiles.title')}</h2>
      {tileTypes.length === 0 && <p className="hint">{t('tiles.empty')}</p>}
      <ul className="element-list">
        {tileTypes.map((tt) => {
          const active = selection?.kind === 'tileType' && selection.id === tt.id
          return (
            <li key={tt.id} className={active ? 'active' : ''}>
              <button
                type="button"
                className="element-row"
                onClick={() => select({ kind: 'tileType', id: tt.id })}
              >
                <span className="element-name">
                  <span className="color-chip" style={{ background: tt.color }} />
                  {tt.name}
                </span>
                <span className="element-kind">
                  {tt.width}×{tt.height} cm
                </span>
              </button>
              <button
                type="button"
                className="element-delete"
                onClick={() => removeTileType(tt.id)}
                aria-label={t('common.delete')}
                title={t('common.delete')}
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        className="action-button"
        onClick={() =>
          addTileType(createTileType(`${t('tiles.default')} ${tileTypes.length + 1}`, tileTypes.length))
        }
      >
        + {t('tiles.add')}
      </button>
    </section>
  )
}
