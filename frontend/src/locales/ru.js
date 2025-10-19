import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'Russian' }
messages.languages = {
  en: 'Английский',
  ja: 'Японский',
  ko: 'Корейский',
  zh: 'Китайский',
  ru: 'Русский',
  fr: 'Французский',
  es: 'Испанский',
  de: 'Немецкий',
  it: 'Итальянский'
}

export default messages
