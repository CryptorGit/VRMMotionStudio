import en from './en.js'

const messages = JSON.parse(JSON.stringify(en))

messages.meta = { name: 'Korean' }
messages.languages = {
  en: '영어',
  ja: '일본어',
  ko: '한국어',
  zh: '중국어',
  ru: '러시아어',
  fr: '프랑스어',
  es: '스페인어',
  de: '독일어',
  it: '이탈리아어'
}

export default messages
