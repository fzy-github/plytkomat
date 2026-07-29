import { useTranslation } from 'react-i18next'
import { getResults } from '../state/selectors'
import { useStore } from '../state/store'

const fmt = (n: number) => n.toFixed(2)

/** Dolny, zwijany panel wyników: wiersze per typ płytki + ostrzeżenia. */
export function ResultsPanel() {
  const { t } = useTranslation()
  const project = useStore((s) => s.project)
  const ui = useStore((s) => s.ui)
  const toggleResults = useStore((s) => s.toggleResults)

  const { perTileType, warnings } = getResults(project, ui.calcMode)
  const typeById = new Map(project.tileTypes.map((tt) => [tt.id, tt]))
  const totalPurchase = perTileType.reduce((s, r) => s + r.purchaseAreaM2, 0)
  const totalNet = perTileType.reduce((s, r) => s + r.netAreaM2, 0)

  return (
    <section className={`results-panel ${ui.resultsOpen ? 'open' : ''}`}>
      <button type="button" className="results-header" onClick={toggleResults}>
        <span className="results-title">{t('results.title')}</span>
        <span className="results-summary">
          {perTileType.length > 0 &&
            `${fmt(totalNet)} m² → ${t('results.purchaseShort')} ${fmt(totalPurchase)} m²`}
        </span>
        <span className="results-chevron">{ui.resultsOpen ? '▾' : '▴'}</span>
      </button>
      {ui.resultsOpen && (
        <div className="results-body">
          {perTileType.length === 0 ? (
            <p className="hint">{t('results.empty')}</p>
          ) : (
            <table className="results-table">
              <thead>
                <tr>
                  <th>{t('results.tileType')}</th>
                  <th>{t('results.netArea')}</th>
                  <th>{t('results.tiles')}</th>
                  <th>{t('results.tilesWaste', { waste: project.settings.wastePercent })}</th>
                  <th>{t('results.purchase')}</th>
                </tr>
              </thead>
              <tbody>
                {perTileType.map((row) => {
                  const tt = typeById.get(row.tileTypeId)
                  if (!tt) return null
                  return (
                    <tr key={row.tileTypeId}>
                      <td>
                        <span className="color-chip" style={{ background: tt.color }} />
                        {tt.name}{' '}
                        <span className="element-kind">
                          {tt.width}×{tt.height}
                        </span>
                      </td>
                      <td>{fmt(row.netAreaM2)} m²</td>
                      <td>{t('results.pieces', { count: row.totalTiles })}</td>
                      <td>{t('results.pieces', { count: row.tilesWithWaste })}</td>
                      <td>{fmt(row.purchaseAreaM2)} m²</td>
                    </tr>
                  )
                })}
                {perTileType.length > 1 && (
                  <tr className="results-total">
                    <td>{t('results.total')}</td>
                    <td>{fmt(totalNet)} m²</td>
                    <td />
                    <td />
                    <td>{fmt(totalPurchase)} m²</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {warnings.length > 0 && (
            <ul className="results-warnings">
              {warnings.map((w, i) => (
                <li key={i}>⚠ {t(w.key, w.params)}</li>
              ))}
            </ul>
          )}
          <p className="hint">{t('results.estimateNote')}</p>
        </div>
      )}
    </section>
  )
}
