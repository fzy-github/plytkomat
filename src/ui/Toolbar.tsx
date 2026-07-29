import { useTranslation } from 'react-i18next'
import { createNiche, createOpening } from '../model/defaults'
import { useStore } from '../state/store'

export function Toolbar() {
  const { t, i18n } = useTranslation()
  const name = useStore((s) => s.project.name)
  const setProjectName = useStore((s) => s.setProjectName)
  const addElement = useStore((s) => s.addElement)
  const lang = i18n.resolvedLanguage

  const handleAdd = (kind: string) => {
    if (kind === 'niche') addElement(createNiche(t('palette.niche')))
    else if (kind === 'opening') addElement(createOpening(t('palette.opening')))
  }

  return (
    <header className="toolbar">
      <span className="app-title">{t('app.title')}</span>
      <input
        className="project-name"
        value={name}
        onChange={(e) => setProjectName(e.target.value)}
        aria-label={t('app.projectName')}
      />
      <select
        className="add-element"
        value=""
        onChange={(e) => handleAdd(e.target.value)}
        aria-label={t('palette.add')}
      >
        <option value="" disabled>
          + {t('palette.add')}
        </option>
        <option value="niche">{t('palette.niche')}</option>
        <option value="opening">{t('palette.opening')}</option>
      </select>
      <span className="toolbar-spacer" />
      <div className="lang-switch" role="group" aria-label="Language">
        <button
          type="button"
          className={lang === 'pl' ? 'active' : ''}
          onClick={() => void i18n.changeLanguage('pl')}
        >
          PL
        </button>
        <button
          type="button"
          className={lang === 'en' ? 'active' : ''}
          onClick={() => void i18n.changeLanguage('en')}
        >
          EN
        </button>
      </div>
    </header>
  )
}
