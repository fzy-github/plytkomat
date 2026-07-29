import { SceneRoot } from '../scene/SceneRoot'
import { SidePanel } from './SidePanel'
import { Toolbar } from './Toolbar'

export function Layout() {
  return (
    <div className="app-layout">
      <Toolbar />
      <div className="app-main">
        <SidePanel />
        <div className="viewport">
          <SceneRoot />
        </div>
      </div>
    </div>
  )
}
