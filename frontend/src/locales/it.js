import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'Italian' }
messages.languages = {
  en: 'Inglese',
  ja: 'Giapponese',
  ko: 'Coreano',
  zh: 'Cinese',
  ru: 'Russo',
  fr: 'Francese',
  es: 'Spagnolo',
  de: 'Tedesco',
  it: 'Italiano'
}

export default messages
