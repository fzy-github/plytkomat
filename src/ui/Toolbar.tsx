import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createBox,
  createNiche,
  createOpening,
  createPartition,
  createTubEnclosure,
} from '../model/defaults'
import { exportProjectFile, importProjectFile } from '../state/persistence'
import { useStore } from '../state/store'

export function Toolbar() {
  const { t, i18n } = useTranslation()
  const project = useStore((s) => s.project)
  const name = useStore((s) => s.project.name)
  const setProjectName = useStore((s) => s.setProjectName)
  const addElement = useStore((s) => s.addElement)
  const importProject = useStore((s) => s.importProject)
  const resetProject = useStore((s) => s.resetProject)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lang = i18n.resolvedLanguage

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return
    try {
      importProject(await importProjectFile(file))
    } catch {
      window.alert(t('io.importError'))
    }
  }

  const handleAdd = (kind: string) => {
    if (kind === 'niche') addElement(createNiche(t('palette.niche')))
    else if (kind === 'opening') addElement(createOpening(t('palette.opening')))
    else if (kind === 'partition') addElement(createPartition(t('palette.partition')))
    else if (kind === 'tubEnclosure') addElement(createTubEnclosure(t('palette.tubEnclosure')))
    else if (kind === 'box') addElement(createBox(t('palette.box')))
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
        <option value="partition">{t('palette.partition')}</option>
        <option value="niche">{t('palette.niche')}</option>
        <option value="tubEnclosure">{t('palette.tubEnclosure')}</option>
        <option value="box">{t('palette.box')}</option>
        <option value="opening">{t('palette.opening')}</option>
      </select>
      <span className="toolbar-spacer" />
      <button type="button" className="action-button" onClick={() => exportProjectFile(project)}>
        {t('io.export')}
      </button>
      <button type="button" className="action-button" onClick={() => fileInputRef.current?.click()}>
        {t('io.import')}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          void handleImportFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="action-button"
        onClick={() => {
          if (window.confirm(t('io.resetConfirm'))) resetProject()
        }}
      >
        {t('io.reset')}
      </button>
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
