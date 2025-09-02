export const VOWEL_MORPH_NAMES = ['あ', 'い', 'う', 'え', 'お']

export function isVowelMorphName(name) {
  return VOWEL_MORPH_NAMES.includes(name)
}

const DISPLAY_NAME_MAP = {
  あ: 'あ',
  い: 'い',
  う: 'う',
  え: 'え',
  お: 'お',
}

export function getMorphDisplayName(name) {
  return DISPLAY_NAME_MAP[name] || name
}
