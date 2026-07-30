import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalcMode, RegionCalcResult, TileTypeSummary } from '../calc/types'
import type { Surface } from '../geometry/surfaces'
import type { TileRegion, TileType } from '../model/types'
import { getResults, getSurfaces } from '../state/selectors'
import { useStore } from '../state/store'
import { surfaceLabel } from './surfaceLabel'

const fmt = (n: number) => n.toFixed(2)

/**
 * Dolny, zwijany panel wyników: przełącznik trybu Prosty/Układ, wiersze per
 * typ płytki (rozwijalne do breakdownu per region) + ostrzeżenia.
 */
export function ResultsPanel() {
  const { t } = useTranslation()
  const project = useStore((s) => s.project)
  const ui = useStore((s) => s.ui)
  const toggleResults = useStore((s) => s.toggleResults)
  const setCalcMode = useStore((s) => s.setCalcMode)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const layout = ui.calcMode === 'layout'
  const { regions, perTileType, warnings } = getResults(project, ui.calcMode)
  const typeById = new Map(project.tileTypes.map((tt) => [tt.id, tt]))
  const regionById = new Map(project.regions.map((r) => [r.id, r]))
  const surfaceById = new Map(getSurfaces(project).map((s) => [s.id, s]))
  const totalPurchase = perTileType.reduce((s, r) => s + r.purchaseAreaM2, 0)
  const totalNet = perTileType.reduce((s, r) => s + r.netAreaM2, 0)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const modeButton = (mode: CalcMode, label: string) => (
    <button
      type="button"
      className={ui.calcMode === mode ? 'active' : ''}
      onClick={(e) => {
        e.stopPropagation()
        setCalcMode(mode)
      }}
    >
      {label}
    </button>
  )

  const hasPackages = perTileType.some((r) => r.packages !== undefined)
  // Jawna arytmetyka kolumn (wypełnione komórki podwiersza: etykieta, netto,
  // [pełne, docinki,] sztuki) — naprawia wcześniejszy off-by-one w colSpan.
  const columns = (layout ? 7 : 5) + (hasPackages ? 1 : 0)

  return (
    <section className={`results-panel ${ui.resultsOpen ? 'open' : ''}`}>
      <div
        className="results-header"
        onClick={toggleResults}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') toggleResults()
        }}
      >
        <span className="results-title">{t('results.title')}</span>
        <span className="lang-switch results-mode" role="group" aria-label={t('results.mode')}>
          {modeButton('simple', t('results.modeSimple'))}
          {modeButton('layout', t('results.modeLayout'))}
        </span>
        <span className="results-summary">
          {perTileType.length > 0 &&
            `${fmt(totalNet)} m² → ${t('results.purchaseShort')} ${fmt(totalPurchase)} m²`}
        </span>
        <span className="results-chevron">{ui.resultsOpen ? '▾' : '▴'}</span>
      </div>
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
                  {layout && <th>{t('results.fullTiles')}</th>}
                  {layout && <th>{t('results.cuts')}</th>}
                  <th>{t('results.tiles')}</th>
                  <th>{t('results.tilesWaste', { waste: project.settings.wastePercent })}</th>
                  {hasPackages && <th>{t('results.packages')}</th>}
                  <th>{t('results.purchase')}</th>
                </tr>
              </thead>
              <tbody>
                {perTileType.map((row) => {
                  const tt = typeById.get(row.tileTypeId)
                  if (!tt) return null
                  const typeRegions = regions.filter((r) => r.tileTypeId === row.tileTypeId)
                  const isOpen = expanded.has(row.tileTypeId)
                  const fullSum = typeRegions.reduce((s, r) => s + (r.fullTiles ?? 0), 0)
                  const cutSum = typeRegions.reduce((s, r) => s + (r.cutCells ?? 0), 0)
                  const servedSum = typeRegions.reduce(
                    (s, r) => s + (r.cutsServedByOffcuts ?? 0),
                    0,
                  )
                  return (
                    <TypeRows
                      key={row.tileTypeId}
                      row={row}
                      tt={tt}
                      layout={layout}
                      isOpen={isOpen}
                      toggle={() => toggleExpand(row.tileTypeId)}
                      fullSum={fullSum}
                      cutSum={cutSum}
                      servedSum={servedSum}
                      typeRegions={typeRegions}
                      regionById={regionById}
                      surfaceById={surfaceById}
                      columns={columns}
                      hasPackages={hasPackages}
                    />
                  )
                })}
                {perTileType.length > 1 && (
                  <tr className="results-total">
                    <td>{t('results.total')}</td>
                    <td>{fmt(totalNet)} m²</td>
                    {layout && <td />}
                    {layout && <td />}
                    <td />
                    <td />
                    {hasPackages && <td />}
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

interface TypeRowsProps {
  row: TileTypeSummary
  tt: TileType
  layout: boolean
  isOpen: boolean
  toggle: () => void
  fullSum: number
  cutSum: number
  servedSum: number
  typeRegions: RegionCalcResult[]
  regionById: Map<string, TileRegion>
  surfaceById: Map<string, Surface>
  columns: number
  hasPackages: boolean
}

function TypeRows({
  row,
  tt,
  layout,
  isOpen,
  toggle,
  fullSum,
  cutSum,
  servedSum,
  typeRegions,
  regionById,
  surfaceById,
  columns,
  hasPackages,
}: TypeRowsProps) {
  const { t } = useTranslation()
  const project = useStore((s) => s.project)
  const piecesKey = tt.kind === 'panel' ? 'results.planks' : 'results.pieces'
  return (
    <>
      <tr className="results-row" onClick={toggle}>
        <td>
          <span className="results-expand">{isOpen ? '▾' : '▸'}</span>
          <span className="color-chip" style={{ background: tt.color }} />
          {tt.name}{' '}
          <span className="element-kind">
            {tt.width}×{tt.height}
          </span>
        </td>
        <td>{fmt(row.netAreaM2)} m²</td>
        {layout && <td>{fullSum}</td>}
        {layout && (
          <td>
            {cutSum}
            {servedSum > 0 && (
              <span className="element-kind"> ({t('results.fromOffcuts', { count: servedSum })})</span>
            )}
          </td>
        )}
        <td>{t(piecesKey, { count: row.totalTiles })}</td>
        <td>{t(piecesKey, { count: row.tilesWithWaste })}</td>
        {hasPackages && (
          <td>
            {row.packages !== undefined
              ? t('results.packagesCount', { count: row.packages })
              : '—'}
          </td>
        )}
        <td>{fmt(row.purchaseAreaM2)} m²</td>
      </tr>
      {isOpen &&
        typeRegions.map((r) => {
          const region = regionById.get(r.regionId)
          const surface = region ? surfaceById.get(region.surfaceId) : undefined
          return (
            <tr key={r.regionId} className="results-subrow">
              <td>{surface ? surfaceLabel(surface, project, t) : r.regionId}</td>
              <td>{fmt(r.netAreaM2)} m²</td>
              {layout && <td>{r.fullTiles ?? 0}</td>}
              {layout && (
                <td>
                  {r.cutCells ?? 0}
                  {(r.cutsServedByOffcuts ?? 0) > 0 && (
                    <span className="element-kind">
                      {' '}
                      ({t('results.fromOffcuts', { count: r.cutsServedByOffcuts })})
                    </span>
                  )}
                </td>
              )}
              <td>{t(piecesKey, { count: r.totalTiles })}</td>
              <td colSpan={columns - (layout ? 5 : 3)} />
            </tr>
          )
        })}
    </>
  )
}
