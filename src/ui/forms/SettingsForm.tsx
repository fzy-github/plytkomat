import { useTranslation } from 'react-i18next'
import { useStore } from '../../state/store'
import { NumberField } from '../NumberField'

export function SettingsForm() {
  const { t } = useTranslation()
  const settings = useStore((s) => s.project.settings)
  const updateSettings = useStore((s) => s.updateSettings)

  return (
    <section className="form-section">
      <h2>{t('settings.title')}</h2>
      <NumberField
        label={t('settings.grout')}
        value={settings.groutWidth}
        min={0}
        max={2}
        step={0.1}
        onChange={(groutWidth) => updateSettings({ groutWidth })}
      />
      <NumberField
        label={t('settings.waste')}
        value={settings.wastePercent}
        min={0}
        max={50}
        step={1}
        unit="%"
        onChange={(wastePercent) => updateSettings({ wastePercent })}
      />
      <NumberField
        label={t('settings.minOffcut')}
        value={settings.minOffcut}
        min={0}
        max={30}
        step={1}
        onChange={(minOffcut) => updateSettings({ minOffcut })}
      />
      <NumberField
        label={t('settings.panelMinStart')}
        value={settings.panelMinStart}
        min={0}
        max={100}
        step={1}
        onChange={(panelMinStart) => updateSettings({ panelMinStart })}
      />
      <NumberField
        label={t('settings.panelMinStagger')}
        value={settings.panelMinStagger}
        min={0}
        max={100}
        step={1}
        onChange={(panelMinStagger) => updateSettings({ panelMinStagger })}
      />
    </section>
  )
}
