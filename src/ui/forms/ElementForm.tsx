import { useTranslation } from 'react-i18next'
import type { NicheElement, OpeningElement, WallId } from '../../model/types'
import { useStore } from '../../state/store'
import { NumberField } from '../NumberField'

const WALLS: WallId[] = ['north', 'east', 'south', 'west']

type EditableElement = NicheElement | OpeningElement

/** Formularz właściwości wnęki lub otworu (drzwi/okna). Boxy dochodzą w M3. */
export function ElementForm({ element }: { element: EditableElement }) {
  const { t } = useTranslation()
  const room = useStore((s) => s.project.room)
  const updateElement = useStore((s) => s.updateElement)

  const wallWidth =
    element.wall === 'north' || element.wall === 'south' ? room.width : room.length

  const update = (mutate: (el: EditableElement) => EditableElement) =>
    updateElement(element.id, (el) => mutate(el as EditableElement))
  const patchRect = (next: Partial<EditableElement['rect']>) =>
    update((el) => ({ ...el, rect: { ...el.rect, ...next } }))

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
      <label className="field">
        <span>{t('element.wall')}</span>
        <select
          value={element.wall}
          onChange={(e) => update((el) => ({ ...el, wall: e.target.value as WallId }))}
        >
          {WALLS.map((w) => (
            <option key={w} value={w}>
              {t(`walls.${w}`)}
            </option>
          ))}
        </select>
      </label>
      <NumberField
        label={t('element.x')}
        value={element.rect.x}
        min={0}
        max={wallWidth}
        onChange={(x) => patchRect({ x })}
      />
      <NumberField
        label={t('element.y')}
        value={element.rect.y}
        min={0}
        max={room.height}
        onChange={(y) => patchRect({ y })}
      />
      <NumberField
        label={t('element.width')}
        value={element.rect.w}
        min={1}
        max={wallWidth}
        onChange={(w) => patchRect({ w })}
      />
      <NumberField
        label={t('element.height')}
        value={element.rect.h}
        min={1}
        max={room.height}
        onChange={(h) => patchRect({ h })}
      />
      {element.kind === 'niche' && (
        <NumberField
          label={t('element.depth')}
          value={element.depth}
          min={1}
          max={60}
          onChange={(depth) =>
            update((el) => (el.kind === 'niche' ? { ...el, depth } : el))
          }
        />
      )}
    </section>
  )
}
