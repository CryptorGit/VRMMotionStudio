import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'German' }
messages.languages = {
  en: 'Englisch',
  ja: 'Japanisch',
  ko: 'Koreanisch',
  zh: 'Chinesisch',
  ru: 'Russisch',
  fr: 'Französisch',
  es: 'Spanisch',
  de: 'Deutsch',
  it: 'Italienisch'
}

export default messages
