import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'Spanish' }
messages.languages = {
  en: 'Inglés',
  ja: 'Japonés',
  ko: 'Coreano',
  zh: 'Chino',
  ru: 'Ruso',
  fr: 'Francés',
  es: 'Español',
  de: 'Alemán',
  it: 'Italiano'
}

export default messages
