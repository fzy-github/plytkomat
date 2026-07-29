import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'

export function Toolbar() {
  const { t, i18n } = useTranslation()
  const name = useStore((s) => s.project.name)
  const setProjectName = useStore((s) => s.setProjectName)
  const lang = i18n.resolvedLanguage

  return (
    <header className="toolbar">
      <span className="app-title">{t('app.title')}</span>
      <input
        className="project-name"
        value={name}
        onChange={(e) => setProjectName(e.target.value)}
        aria-label={t('app.projectName')}
      />
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
