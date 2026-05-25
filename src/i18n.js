import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en/translation.json'
import he from './locales/he/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'he'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18n_lang',
    },
    interpolation: {
      escapeValue: false,
    },
  })

function applyDir(lang) {
  document.documentElement.lang = lang
  document.documentElement.dir  = lang === 'he' ? 'rtl' : 'ltr'
}

i18n.on('languageChanged', applyDir)

// default to Hebrew if localStorage has no prior choice
if (!localStorage.getItem('i18n_lang')) {
  i18n.changeLanguage('he')
} else {
  applyDir(i18n.language)
}

export default i18n
