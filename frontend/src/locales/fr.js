import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'French' }
messages.languages = {
  en: 'Anglais',
  ja: 'Japonais',
  ko: 'Coréen',
  zh: 'Chinois',
  ru: 'Russe',
  fr: 'Français',
  es: 'Espagnol',
  de: 'Allemand',
  it: 'Italien'
}

export default messages
