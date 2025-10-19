import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'Chinese' }
messages.languages = {
  en: '英语',
  ja: '日语',
  ko: '韩语',
  zh: '中文',
  ru: '俄语',
  fr: '法语',
  es: '西班牙语',
  de: '德语',
  it: '意大利语'
}

export default messages
