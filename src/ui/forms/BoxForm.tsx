import { useTranslation } from 'react-i18next'
import type { BoxElement, BoxFace } from '../../model/types'
import { useStore } from '../../state/store'
import { NumberField } from '../NumberField'

const FACES: BoxFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

/** Formularz ścianki działowej / zabudowy wanny / zabudowy ogólnej. */
export function BoxForm({ element }: { element: BoxElement }) {
  const { t } = useTranslation()
  const room = useStore((s) => s.project.room)
  const updateElement = useStore((s) => s.updateElement)

  const update = (mutate: (el: BoxElement) => BoxElement) =>
    updateElement(element.id, (el) => (el.kind === element.kind ? mutate(el as BoxElement) : el))
  const patchPos = (next: Partial<BoxElement['pos']>) =>
    update((el) => ({ ...el, pos: { ...el.pos, ...next } }))
  const patchSize = (next: Partial<BoxElement['size']>) =>
    update((el) => ({ ...el, size: { ...el.size, ...next } }))
  const toggleFace = (face: BoxFace, enabled: boolean) =>
    update((el) => ({ ...el, faces: { ...el.faces, [face]: enabled } }))

  return (
    <section className="form-section">
      <h2>{t(`palette.${element.kind}`)}</h2>
      <label className="field">
        <span>{t('element.name')}</span>
        <input
          value={element.name}
          onChange={(e) => update((el) => ({ ...el, name: e.target.value }))}
        />
      </label>
      <NumberField
        label={t('box.posX')}
        value={element.pos.x}
        min={0}
        max={room.width}
        onChange={(x) => patchPos({ x })}
      />
      <NumberField
        label={t('box.posZ')}
        value={element.pos.z}
        min={0}
        max={room.length}
        onChange={(z) => patchPos({ z })}
      />
      <NumberField
        label={t('box.posY')}
        value={element.pos.y}
        min={0}
        max={room.height}
        onChange={(y) => patchPos({ y })}
      />
      <NumberField
        label={t('box.sizeX')}
        value={element.size.x}
        min={1}
        max={room.width}
        onChange={(x) => patchSize({ x })}
      />
      <NumberField
        label={t('box.sizeZ')}
        value={element.size.z}
        min={1}
        max={room.length}
        onChange={(z) => patchSize({ z })}
      />
      <NumberField
        label={t('box.sizeY')}
        value={element.size.y}
        min={1}
        max={room.height}
        onChange={(y) => patchSize({ y })}
      />
      <h2>{t('box.faces')}</h2>
      <div className="face-toggles">
        {FACES.map((face) => (
          <label key={face} className="face-toggle">
            <input
              type="checkbox"
              checked={element.faces?.[face] !== false}
              onChange={(e) => toggleFace(face, e.target.checked)}
            />
            <span>{t(`box.face.${face}`)}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
