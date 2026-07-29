import { getSurfaces } from '../state/selectors'
import { useStore } from '../state/store'
import { ElementList } from './ElementList'
import { RegionList } from './RegionList'
import { SurfacePanel } from './SurfacePanel'
import { TileTypeList } from './TileTypeList'
import { BoxForm } from './forms/BoxForm'
import { ElementForm } from './forms/ElementForm'
import { RegionForm } from './forms/RegionForm'
import { RoomForm } from './forms/RoomForm'
import { TileTypeForm } from './forms/TileTypeForm'

function SelectionDetail() {
  const selection = useStore((s) => s.selection)
  const project = useStore((s) => s.project)
  if (!selection) return null

  if (selection.kind === 'element') {
    const el = project.elements.find((e) => e.id === selection.id)
    if (!el) return null
    return el.kind === 'niche' || el.kind === 'opening' ? (
      <ElementForm element={el} />
    ) : (
      <BoxForm element={el} />
    )
  }
  if (selection.kind === 'tileType') {
    const tt = project.tileTypes.find((t) => t.id === selection.id)
    return tt ? <TileTypeForm tileType={tt} /> : null
  }
  if (selection.kind === 'surface') {
    const surface = getSurfaces(project).find((s) => s.id === selection.id)
    return surface ? <SurfacePanel surface={surface} /> : null
  }
  if (selection.kind === 'region') {
    const region = project.regions.find((r) => r.id === selection.id)
    if (!region) return null
    const surface = getSurfaces(project).find((s) => s.id === region.surfaceId)
    return surface ? <RegionForm region={region} surface={surface} /> : null
  }
  return null
}

export function SidePanel() {
  return (
    <aside className="side-panel">
      <SelectionDetail />
      <RoomForm />
      <ElementList />
      <TileTypeList />
      <RegionList />
    </aside>
  )
}
