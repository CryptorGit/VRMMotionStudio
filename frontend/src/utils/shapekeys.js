function isObject3D(value) {
  return !!(value && typeof value === 'object' && typeof value.traverse === 'function')
}

function getUserDataStore(root) {
  if (!root) return null
  if (!root.userData) root.userData = {}
  return root.userData
}

function isMeshWithMorphTargets(obj) {
  return !!(obj && obj.isMesh && obj.morphTargetInfluences && obj.morphTargetDictionary)
}

function resetShapeKeyDisplayNames(store) {
  if (!store) return {}
  store.__shapeKeyDisplayNames = {}
  return store.__shapeKeyDisplayNames
}

function ensureShapeKeyDisplayNames(store) {
  if (!store) return {}
  if (!store.__shapeKeyDisplayNames || typeof store.__shapeKeyDisplayNames !== 'object') {
    store.__shapeKeyDisplayNames = {}
  }
  return store.__shapeKeyDisplayNames
}

function getStoredShapeKeyDisplayName(store, rawName) {
  if (!store || !rawName) return ''
  const displayStore = store.__shapeKeyDisplayNames
  const value = displayStore && typeof displayStore === 'object' ? displayStore[rawName] : undefined
  return typeof value === 'string' ? value : ''
}

function isMeaningfulDisplayName(name) {
  if (!name) return false
  const trimmed = String(name).trim()
  if (!trimmed) return false
  return !/^[0-9]+$/.test(trimmed)
}

function recordShapeKeyDisplayName(store, rawName, candidate) {
  if (!store || !rawName || !candidate) return
  const trimmed = String(candidate).trim()
  if (!trimmed) return
  const displayStore = ensureShapeKeyDisplayNames(store)
  const existing = displayStore[rawName]
  if (!existing) {
    displayStore[rawName] = trimmed
    return
  }
  if (!isMeaningfulDisplayName(existing) && isMeaningfulDisplayName(trimmed)) {
    displayStore[rawName] = trimmed
  }
}

function pickFromArray(source, index) {
  if (!Array.isArray(source)) return null
  const value = source[index]
  if (value == null) return null
  const str = String(value).trim()
  return str.length ? str : null
}

function extractMorphTargetDisplayName(obj, index) {
  if (!obj || !Number.isInteger(index)) return null
  const geometry = obj.geometry
  const candidates = []
  candidates.push(pickFromArray(obj.userData?.targetNames, index))
  if (geometry?.userData) {
    candidates.push(pickFromArray(geometry.userData.targetNames, index))
    candidates.push(pickFromArray(geometry.userData.gltfExtras?.targetNames, index))
    candidates.push(pickFromArray(geometry.userData.gltf?.targetNames, index))
  }
  if (geometry?.morphAttributes && typeof geometry.morphAttributes === 'object') {
    for (const attrArray of Object.values(geometry.morphAttributes)) {
      if (!Array.isArray(attrArray)) continue
      const attribute = attrArray[index]
      if (attribute) {
        const attrName = attribute.name || attribute?.userData?.name
        const trimmed = attrName ? String(attrName).trim() : ''
        if (trimmed) {
          candidates.push(trimmed)
          break
        }
      }
    }
  }
  if (Array.isArray(geometry?.morphTargets)) {
    const mt = geometry.morphTargets[index]
    if (mt?.name) {
      const trimmed = String(mt.name).trim()
      if (trimmed) candidates.push(trimmed)
    }
  }
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length) {
      return value.trim()
    }
  }
  return null
}

export function clearShapeKeyCache(root) {
  const store = getUserDataStore(root)
  if (!store) return
  delete store.__shapeKeyCache
  delete store.__shapeKeyDisplayNames
}

export function ensureShapeKeyCache(root, { force = false } = {}) {
  const store = getUserDataStore(root)
  if (!store) return new Map()
  if (!force && store.__shapeKeyCache instanceof Map) return store.__shapeKeyCache
  const map = new Map()
  resetShapeKeyDisplayNames(store)
  if (!isObject3D(root)) {
    store.__shapeKeyCache = map
    return map
  }
  try {
    root.traverse(obj => {
      if (!isMeshWithMorphTargets(obj)) return
      const dict = obj.morphTargetDictionary || {}
      const influences = obj.morphTargetInfluences || []
      
      // morphTargetDictionaryから読み込み
      for (const [name, index] of Object.entries(dict)) {
        if (!Number.isInteger(index)) continue
        if (index < 0 || index >= influences.length) continue // 有効な範囲のみ
        if (!map.has(name)) map.set(name, [])
        map.get(name).push({ object: obj, index })
        const displayName = extractMorphTargetDisplayName(obj, index)
        if (displayName) recordShapeKeyDisplayName(store, name, displayName)
      }
      
      // geometry.morphAttributesからも確認（dictにない場合のフォールバック）
      const geometry = obj.geometry
      if (geometry?.morphAttributes && typeof geometry.morphAttributes === 'object') {
        const positionMorphs = geometry.morphAttributes.position || []
        for (let i = 0; i < positionMorphs.length; i++) {
          const attr = positionMorphs[i]
          if (!attr) continue
          
          // dictに既に存在する場合はスキップ
          const existingName = Object.keys(dict).find(key => dict[key] === i)
          if (existingName) continue
          
          // 属性から名前を取得
          const attrName = attr.name || attr?.userData?.name
          const candidateName = attrName ? String(attrName).trim() : `morph_${i}`
          
          if (candidateName && i < influences.length) {
            if (!map.has(candidateName)) map.set(candidateName, [])
            map.get(candidateName).push({ object: obj, index: i })
            recordShapeKeyDisplayName(store, candidateName, candidateName)
          }
        }
      }
    })
  } catch {}
  store.__shapeKeyCache = map
  return map
}

export function ensureShapeKeyOverrides(root) {
  const store = getUserDataStore(root)
  if (!store) return {}
  if (!store.__shapeKeyOverrides || typeof store.__shapeKeyOverrides !== 'object') {
    store.__shapeKeyOverrides = {}
  }
  return store.__shapeKeyOverrides
}

export function listShapeKeys(root, { includeExpressions = true, exclude = [] } = {}) {
  const map = ensureShapeKeyCache(root)
  let names = Array.from(map.keys())
  if (!includeExpressions && exclude.length) {
    const ignore = new Set(exclude.map(name => String(name).toLowerCase()))
    names = names.filter(name => !ignore.has(String(name).toLowerCase()))
  }
  names.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
  return names
}

const SHAPEKEY_LABEL_OVERRIDES = {
  Basis: 'Basis',
  blink: 'Blink',
  blink_L: 'Blink Left',
  blink_R: 'Blink Right',
  wink: 'Wink',
  wink_L: 'Wink Left',
  wink_R: 'Wink Right',
  smile: 'Smile',
  frown: 'Frown'
}

const SHAPEKEY_GROUP_DEFINITIONS = [
  { key: 'eyes', label: '目・瞳', matchers: [/\beye/i, /blink/, /wink/, /look(?!at)/, /gaze/, /pupil/, /iris/, /睨/, /視線/, /目線/, /注視/, /^目/, /瞳/, /ウィンク/, /まばたき/, /^見/] },
  { key: 'brow', label: '眉', matchers: [/brow/, /mayu/, /眉/] },
  { key: 'mouth', label: '口・口元', matchers: [/mouth/, /\blip/i, /jaw/, /tongue/, /teeth/, /^[aiueo]$/i, /viseme/, /vrc\.v_/, /^口/, /^あ/, /^い/, /^う/, /^え/, /^お/, /^ん/, /^笑/, /smile/, /frown/, /舌/, /歯/] },
  { key: 'face', label: '頬・表情', matchers: [/face/, /cheek/, /nose/, /鼻/, /頬/, /tear/, /涙/, /ほお/, /頰/, /表情/] },
  { key: 'hair', label: '髪', matchers: [/hair/, /髪/, /bang/, /前髪/] },
  { key: 'body', label: '身体', matchers: [/body/, /bust/, /breast/, /arm/, /hand/, /finger/, /leg/, /foot/, /toe/, /shoulder/, /spine/, /waist/, /hip/, /neck/, /頭/, /肩/, /腕/, /手/, /足/, /指/, /胸/, /体/] }
]

const SHAPEKEY_GROUP_ORDER = ['eyes', 'brow', 'mouth', 'face', 'hair', 'body', 'other']

const DEFAULT_UNNAMED_LABEL = '名称未設定'

function normalizeShapeKeyName(name) {
  if (!name) return ''
  const override = SHAPEKEY_LABEL_OVERRIDES[name]
  if (override) return override
  const normalized = String(name)
    .replace(/^blendshape\./i, '')
    .replace(/[_\-.]+/g, ' ')
  const hasAscii = /[a-zA-Z]/.test(normalized)
  if (!hasAscii) return normalized
  return normalized
    .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z])/g, s => s.toUpperCase())
}

function isDigitsOnly(name) {
  return !name ? false : /^[0-9]+$/.test(String(name).trim())
}

function ensureNonNumericLabel(source, fallback = DEFAULT_UNNAMED_LABEL) {
  const trimmed = String(source ?? '').trim()
  if (!trimmed || isDigitsOnly(trimmed)) return fallback
  return trimmed
}

function inferShapeKeyGroup(name) {
  const lower = String(name).toLowerCase()
  for (const def of SHAPEKEY_GROUP_DEFINITIONS) {
    if (def.matchers.some(re => re.test(lower))) {
      return { key: def.key, label: def.label }
    }
  }
  return { key: 'other', label: 'その他' }
}

function getShapeKeyDisplayName(root, name) {
  const store = getUserDataStore(root)
  if (!store) return ''
  return getStoredShapeKeyDisplayName(store, name)
}

export function describeShapeKeys(root, { includeExpressions = false, exclude = [] } = {}) {
  const names = listShapeKeys(root, { includeExpressions, exclude })
  const groups = new Map()
  const duplicateTracker = new Map()
  const duplicateSuffix = labelIndex => {
    const index = Number(labelIndex)
    if (!Number.isFinite(index) || index < 1) return ''
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    if (index - 1 < alphabet.length) return alphabet[index - 1]
    const cycles = Math.floor((index - 1) / alphabet.length)
    const remainder = (index - 1) % alphabet.length
    return alphabet[cycles % alphabet.length] + alphabet[remainder]
  }
  for (const rawName of names) {
    const displaySource = ensureNonNumericLabel(getShapeKeyDisplayName(root, rawName) || rawName)
    const { key, label } = inferShapeKeyGroup(displaySource)
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] })
    }
    const friendlyRaw = ensureNonNumericLabel(normalizeShapeKeyName(displaySource))
    const friendly = friendlyRaw || ensureNonNumericLabel(displaySource)
    const group = groups.get(key)
    const dupKey = `${key}:${friendly}`
    const count = duplicateTracker.get(dupKey) || 0
    duplicateTracker.set(dupKey, count + 1)
    let display = friendly
    if (count > 0) {
      const marker = duplicateSuffix(count) || '別'
      display = `${friendly}（${marker}）`
    }
    group.items.push({
      name: rawName,
      label: display,
      original: rawName,
      friendly,
      displayName: displaySource
    })
  }
  const orderWeight = key => {
    const idx = SHAPEKEY_GROUP_ORDER.indexOf(key)
    return idx === -1 ? SHAPEKEY_GROUP_ORDER.length + 1 : idx
  }
  const ordered = Array.from(groups.values())
  ordered.sort((a, b) => orderWeight(a.key) - orderWeight(b.key))
  for (const group of ordered) {
    group.items.sort((a, b) => a.label.localeCompare(b.label, 'ja'))
  }
  return ordered.filter(group => group.items.length > 0)
}

function clampValue(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(1, Math.max(-1, num))
}

export function getShapeKeyValue(root, name) {
  if (!name) return 0
  const overrides = ensureShapeKeyOverrides(root)
  if (Object.prototype.hasOwnProperty.call(overrides, name)) {
    return overrides[name]
  }
  const map = ensureShapeKeyCache(root)
  const entries = map.get(name)
  if (!entries || entries.length === 0) return 0
  let total = 0
  let count = 0
  for (const entry of entries) {
    const obj = entry?.object
    const index = entry?.index
    if (!isMeshWithMorphTargets(obj)) continue
    const influences = obj.morphTargetInfluences
    if (!influences || index < 0 || index >= influences.length) continue
    const raw = influences[index]
    if (!Number.isFinite(raw)) continue
    total += raw
    count++
  }
  return count > 0 ? total / count : 0
}

export function setShapeKeyValue(root, name, value) {
  if (!name) return
  const overrides = ensureShapeKeyOverrides(root)
  const map = ensureShapeKeyCache(root)
  const entries = map.get(name)
  if (!entries || entries.length === 0) return
  const clamped = clampValue(value)
  overrides[name] = clamped
  for (const entry of entries) {
    const obj = entry?.object
    const index = entry?.index
    if (!isMeshWithMorphTargets(obj)) continue
    if (!obj.morphTargetInfluences || index < 0 || index >= obj.morphTargetInfluences.length) continue
    obj.morphTargetInfluences[index] = clamped
  }
}

export function applyShapeKeyOverrides(root) {
  if (!root || !isObject3D(root)) return
  const overrides = ensureShapeKeyOverrides(root)
  if (!overrides || typeof overrides !== 'object') return
  const map = ensureShapeKeyCache(root)
  for (const [name, value] of Object.entries(overrides)) {
    const entries = map.get(name)
    if (!entries || entries.length === 0) continue
    const clamped = clampValue(value)
    for (const entry of entries) {
      const obj = entry?.object
      const index = entry?.index
      if (!isMeshWithMorphTargets(obj)) continue
      if (!obj.morphTargetInfluences || index < 0 || index >= obj.morphTargetInfluences.length) continue
      obj.morphTargetInfluences[index] = clamped
    }
  }
}
