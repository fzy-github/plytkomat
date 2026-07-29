import { ElementList } from './ElementList'
import { ElementForm } from './forms/ElementForm'
import { RoomForm } from './forms/RoomForm'
import { useStore } from '../state/store'

export function SidePanel() {
  const selection = useStore((s) => s.selection)
  const elements = useStore((s) => s.project.elements)
  const selected =
    selection?.kind === 'element'
      ? elements.find((el) => el.id === selection.id)
      : undefined
  const editable =
    selected && (selected.kind === 'niche' || selected.kind === 'opening')
      ? selected
      : undefined

  return (
    <aside className="side-panel">
      <RoomForm />
      <ElementList />
      {editable && <ElementForm element={editable} />}
    </aside>
  )
}
