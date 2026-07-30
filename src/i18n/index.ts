import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import pl from './pl.json'

const LANG_KEY = 'plytkomat:lang'

const stored = localStorage.getItem(LANG_KEY)
const initial = stored ?? (navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en')

void i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'pl',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANG_KEY, lng)
})

export default i18n
