import { SceneRoot } from '../scene/SceneRoot'
import { ResultsPanel } from './ResultsPanel'
import { SidePanel } from './SidePanel'
import { Toolbar } from './Toolbar'

export function Layout() {
  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-main">
        <SidePanel />
        <div className="viewport-column">
          <div className="viewport">
            <SceneRoot />
          </div>
          <ResultsPanel />
        </div>
      </div>
    </div>
  )
}
