import { useTranslation } from 'react-i18next'
import { useStore } from '../../state/store'
import { NumberField } from '../NumberField'

export function RoomForm() {
  const { t } = useTranslation()
  const room = useStore((s) => s.project.room)
  const setRoom = useStore((s) => s.setRoom)

  return (
    <section className="form-section">
      <h2>{t('room.title')}</h2>
      <NumberField
        label={t('room.width')}
        value={room.width}
        min={50}
        max={1000}
        onChange={(width) => setRoom({ width })}
      />
      <NumberField
        label={t('room.length')}
        value={room.length}
        min={50}
        max={1000}
        onChange={(length) => setRoom({ length })}
      />
      <NumberField
        label={t('room.height')}
        value={room.height}
        min={150}
        max={500}
        onChange={(height) => setRoom({ height })}
      />
    </section>
  )
}
