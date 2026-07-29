import { useTranslation } from 'react-i18next'
import { useStore } from '../state/store'

export function ElementList() {
  const { t } = useTranslation()
  const elements = useStore((s) => s.project.elements)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const removeElement = useStore((s) => s.removeElement)

  return (
    <section className="form-section">
      <h2>{t('elements.title')}</h2>
      {elements.length === 0 ? (
        <p className="hint">{t('elements.empty')}</p>
      ) : (
        <ul className="element-list">
          {elements.map((el) => {
            const active = selection?.kind === 'element' && selection.id === el.id
            return (
              <li key={el.id} className={active ? 'active' : ''}>
                <button
                  type="button"
                  className="element-row"
                  onClick={() => select({ kind: 'element', id: el.id })}
                >
                  <span className="element-name">{el.name}</span>
                  <span className="element-kind">{t(`palette.${el.kind}`)}</span>
                </button>
                <button
                  type="button"
                  className="element-delete"
                  onClick={() => removeElement(el.id)}
                  aria-label={t('common.delete')}
                  title={t('common.delete')}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
