import { ref, computed } from 'vue'
import en from './en.js'
import ja from './ja.js'
import ko from './ko.js'
import zh from './zh.js'
import ru from './ru.js'
import fr from './fr.js'
import es from './es.js'
import de from './de.js'
import it from './it.js'

const FALLBACK_LOCALE = 'en'
const DEFAULT_LOCALE = 'en' // デフォルトは英語
const STORAGE_KEY = 'app:locale'

const LOCALE_META = {
  en: { name: 'English', tag: 'EN' },
  ja: { name: 'Japanese', tag: 'JA' },
  ko: { name: 'Korean', tag: 'KO' },
  zh: { name: 'Chinese', tag: 'ZH' },
  ru: { name: 'Russian', tag: 'RU' },
  fr: { name: 'French', tag: 'FR' },
  es: { name: 'Spanish', tag: 'ES' },
  de: { name: 'German', tag: 'DE' },
  it: { name: 'Italian', tag: 'IT' }
}

const localeOrder = Object.keys(LOCALE_META)

const translations = {
  en,
  ja,
  ko,
  zh,
  ru,
  fr,
  es,
  de,
  it
}

function loadSavedLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && translations[saved]) return saved
  } catch {}
  // 保存されていない場合はデフォルトの英語を返す
  return DEFAULT_LOCALE
}

function saveLocale(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {}
}

const currentLocale = ref(loadSavedLocale())

export function useI18n() {
  const t = computed(() => translations[currentLocale.value] || translations[FALLBACK_LOCALE])

  const setLocale = (code) => {
    if (!translations[code]) return
    currentLocale.value = code
    saveLocale(code)
  }

  const locale = computed(() => currentLocale.value)

  const availableLocales = computed(() =>
    localeOrder.map(code => ({
      code,
      fallbackName: LOCALE_META[code]?.name || code.toUpperCase(),
      tag: LOCALE_META[code]?.tag || code.toUpperCase()
    }))
  )

  return {
    t,
    locale,
    setLocale,
    availableLocales
  }
}
