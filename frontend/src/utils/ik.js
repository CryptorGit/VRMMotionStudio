import { ref, watch } from 'vue'
import * as THREE from 'three'

export const IK_MARKER_PIXEL_SIZE = 16
export const showIkMarkers = ref(true)
export const ikWarning = ref('')
export const selectedIK = ref(null)
export let ikTargets = []
export const extraIKBoneNames = []
export const extraIKChains = {}
export const ikAliases = new Map()

let cachedFov = null
let cachedFovRad = 0

export async function loadIKConfig() {
  try {
    const res = await fetch('/ik-config.json')
    if (!res.ok) throw new Error('config fetch failed')
    const {
      extraIKBoneNames: boneNames = [],
      extraIKChains: chains = {},
      aliases = {}
    } = await res.json()
    extraIKBoneNames.push(...boneNames.map(normalizeBoneName))
    for (const [key, arr] of Object.entries(chains)) {
      extraIKChains[key] = Array.isArray(arr)
        ? arr.map(normalizeChain)
        : []
    }
    for (const [canonical, names] of Object.entries(aliases)) {
      const canon = normalizeBoneName(canonical)
      ikAliases.set(canon, canon)
      if (Array.isArray(names)) {
        names
          .map(normalizeBoneName)
          .forEach(a => ikAliases.set(a, canon))
      }
    }
  } catch (e) {
    console.warn('Failed to load IK config, applying defaults:', e)
    if (extraIKBoneNames.length === 0) {
      extraIKBoneNames.push(
        ...[
          '左足ＩＫ',
          '右足ＩＫ',
          '左つま先ＩＫ',
          '右つま先ＩＫ',
          '左手ＩＫ',
          '右手ＩＫ',
          '左親指ＩＫ',
          '右親指ＩＫ',
          '左人指ＩＫ',
          '右人指ＩＫ',
          '左中指ＩＫ',
          '右中指ＩＫ',
          '左薬指ＩＫ',
          '右薬指ＩＫ',
          '左小指ＩＫ',
          '右小指ＩＫ'
        ].map(normalizeBoneName)
      )
    }
    if (Object.keys(extraIKChains).length === 0) {
      extraIKChains.default = [
        { target: '左足ＩＫ', effector: '左足首', links: ['左ひざ', '左足'] },
        { target: '右足ＩＫ', effector: '右足首', links: ['右ひざ', '右足'] },
        {
          target: '左つま先ＩＫ',
          effector: '左つま先',
          links: ['左足首', '左ひざ', '左足']
        },
        {
          target: '右つま先ＩＫ',
          effector: '右つま先',
          links: ['右足首', '右ひざ', '右足']
        },
        { target: '左手ＩＫ', effector: '左手首', links: ['左ひじ', '左腕'] },
        { target: '右手ＩＫ', effector: '右手首', links: ['右ひじ', '右腕'] },
        {
          target: '左親指ＩＫ',
          effector: '左親指２',
          links: ['左親指１', '左親指０']
        },
        {
          target: '右親指ＩＫ',
          effector: '右親指２',
          links: ['右親指１', '右親指０']
        },
        {
          target: '左人指ＩＫ',
          effector: '左人指３',
          links: ['左人指２', '左人指１', '左人指０']
        },
        {
          target: '右人指ＩＫ',
          effector: '右人指３',
          links: ['右人指２', '右人指１', '右人指０']
        },
        {
          target: '左中指ＩＫ',
          effector: '左中指３',
          links: ['左中指２', '左中指１', '左中指０']
        },
        {
          target: '右中指ＩＫ',
          effector: '右中指３',
          links: ['右中指２', '右中指１', '右中指０']
        },
        {
          target: '左薬指ＩＫ',
          effector: '左薬指３',
          links: ['左薬指２', '左薬指１', '左薬指０']
        },
        {
          target: '右薬指ＩＫ',
          effector: '右薬指３',
          links: ['右薬指２', '右薬指１', '右薬指０']
        },
        {
          target: '左小指ＩＫ',
          effector: '左小指３',
          links: ['左小指２', '左小指１', '左小指０']
        },
        {
          target: '右小指ＩＫ',
          effector: '右小指３',
          links: ['右小指２', '右小指１', '右小指０']
        }
      ].map(normalizeChain)
    }
  }
}
export const ikConfigPromise = loadIKConfig()

export function attachIKParents(
  bones,
  iks,
  boneIndexMap = createBoneIndexMap(bones)
) {
  const ikParentSuffix = normalizeBoneName('ik親')
  bones.forEach((b, idx) => {
    const norm = normalizeBoneName(b.name)
    if (typeof norm !== 'string' || !norm.endsWith(ikParentSuffix)) return
    const ikName = b.name.normalize('NFKC').replace(/ik親$/i, '')
    const targetIdx = boneIndexMap.get(normalizeBoneName(ikName))
    const chain = iks.find(ik => ik.target === targetIdx)
    if (
      chain &&
      typeof idx === 'number' &&
      !chain.links.some(l => l.index === idx)
    ) {
      chain.links.unshift({ index: idx })
    }
  })
  // Re-run to ensure CCD IK adjacency after inserting parents
  const resolved = resolveIKLinks(iks, bones, boneIndexMap)
  iks.splice(0, iks.length, ...resolved)
  return iks
}

function findUserDataIKs(geometry) {
  const candidates = ['MMD.ik', 'MMD.iks', 'mmd.ik', 'mmd.iks', 'ik', 'iks']
  const ud = geometry?.userData
  const sources = [
    geometry,
    ud,
    ud?.MMDLoader?.geometry,
    ud?.mmdLoader?.geometry,
    ud?.MMDLoader,
    ud?.mmdLoader,
    ud?.metadata
  ]
  for (const s of sources) {
    const src = s?.userData || s
    for (const path of candidates) {
      const iks = path.split('.').reduce((acc, k) => acc?.[k], src)
      if (Array.isArray(iks) && iks.length > 0) return iks
    }
  }
  return []
}

function applyFallbackIKs(
  iks,
  bones,
  modelName,
  boneIndexMap = createBoneIndexMap(bones),
  hasPMXIKs = false
) {
  let result = Array.isArray(iks) ? [...iks] : []
  if (result.length === 0) {
    const fallback = extraIKChains[modelName] || extraIKChains.default
    if (Array.isArray(fallback) && fallback.length > 0) {
      result = fallback.map(ik => ({ ...ik }))
    }
  }
  const fallbackChains = extraIKChains[modelName] || extraIKChains.default || []
  extraIKBoneNames.forEach(name => {
    const idx = boneIndexMap.get(normalizeBoneName(name))
    if (typeof idx !== 'number') return
    const exists = result.some(ik => {
      const target =
        typeof ik.target === 'number'
          ? ik.target
          : boneIndexMap.get(normalizeBoneName(ik.target))
      return target === idx
    })
    if (exists) return
    const chain = fallbackChains.find(
      c => normalizeBoneName(c.target) === normalizeBoneName(name)
    )
    if (chain) result.push({ ...chain })
  })
  result = resolveIKLinks(result, bones, boneIndexMap)
  const seenTargets = new Set()
  result = result.filter(ik => {
    const targetName =
      typeof ik.target === 'number'
        ? normalizeBoneName(bones[ik.target]?.name)
        : normalizeBoneName(ik.target)
    if (!targetName) return true
    if (seenTargets.has(targetName)) return false
    seenTargets.add(targetName)
    return true
  })
  return result
}

// 既知のボーン名エイリアスを正規化するためのマッピング
const boneNameAliases = {
  '右ひざ': '右ひざ',
  '右膝': '右ひざ',
  'right knee': '右ひざ',
  'r knee': '右ひざ',
  '左ひざ': '左ひざ',
  '左膝': '左ひざ',
  'left knee': '左ひざ',
  'l knee': '左ひざ',
  '右足': '右足',
  'right foot': '右足',
  'r foot': '右足',
  'r leg': '右足',
  '左足': '左足',
  'left foot': '左足',
  'l foot': '左足',
  'l leg': '左足',
  '右足首': '右足首',
  'right ankle': '右足首',
  'r ankle': '右足首',
  '左足首': '左足首',
  'left ankle': '左足首',
  'l ankle': '左足首',
  '右ひじ': '右ひじ',
  '右肘': '右ひじ',
  'right elbow': '右ひじ',
  'r elbow': '右ひじ',
  '左ひじ': '左ひじ',
  '左肘': '左ひじ',
  'left elbow': '左ひじ',
  'l elbow': '左ひじ',
  '右腕': '右腕',
  'right arm': '右腕',
  'r arm': '右腕',
  '左腕': '左腕',
  'left arm': '左腕',
  'l arm': '左腕',
  '右手首': '右手首',
  'right wrist': '右手首',
  'r wrist': '右手首',
  '左手首': '左手首',
  'left wrist': '左手首',
  'l wrist': '左手首',
  '右手': '右手',
  'right hand': '右手',
  'r hand': '右手',
  '左手': '左手',
  'left hand': '左手',
  'l hand': '左手',
  '右手ik': '右手ik',
  'right hand ik': '右手ik',
  'r hand ik': '右手ik',
  '左手ik': '左手ik',
  'left hand ik': '左手ik',
  'l hand ik': '左手ik',
  'right thumb ik': '右親指ik',
  'r thumb ik': '右親指ik',
  'left thumb ik': '左親指ik',
  'l thumb ik': '左親指ik',
  'right index ik': '右人指ik',
  'right index finger ik': '右人指ik',
  'r index ik': '右人指ik',
  'r index finger ik': '右人指ik',
  'left index ik': '左人指ik',
  'left index finger ik': '左人指ik',
  'l index ik': '左人指ik',
  'l index finger ik': '左人指ik',
  'right middle ik': '右中指ik',
  'right middle finger ik': '右中指ik',
  'r middle ik': '右中指ik',
  'r middle finger ik': '右中指ik',
  'left middle ik': '左中指ik',
  'left middle finger ik': '左中指ik',
  'l middle ik': '左中指ik',
  'l middle finger ik': '左中指ik',
  'right ring ik': '右薬指ik',
  'right ring finger ik': '右薬指ik',
  'r ring ik': '右薬指ik',
  'r ring finger ik': '右薬指ik',
  'left ring ik': '左薬指ik',
  'left ring finger ik': '左薬指ik',
  'l ring ik': '左薬指ik',
  'l ring finger ik': '左薬指ik',
  'right little ik': '右小指ik',
  'right little finger ik': '右小指ik',
  'r little ik': '右小指ik',
  'r little finger ik': '右小指ik',
  'left little ik': '左小指ik',
  'left little finger ik': '左小指ik',
  'l little ik': '左小指ik',
  'l little finger ik': '左小指ik',
  '右つま先': '右つま先',
  'right toe': '右つま先',
  'r toe': '右つま先',
  '右足先ex': '右つま先',
  '左つま先': '左つま先',
  'left toe': '左つま先',
  'l toe': '左つま先',
  '左足先ex': '左つま先',
  '右膝ik': '右ひざik',
  '左膝ik': '左ひざik',
  'right knee ik': '右ひざik',
  'r knee ik': '右ひざik',
  'left knee ik': '左ひざik',
  'l knee ik': '左ひざik',
  '右足先ik': '右つま先ik',
  '左足先ik': '左つま先ik',
  // IK ボーンの英語・半角表記への対応
  'right leg ik': '右足ik',
  'right foot ik': '右足ik',
  'right ankle ik': '右足ik',
  'r leg ik': '右足ik',
  'r foot ik': '右足ik',
  'r ankle ik': '右足ik',
  'left leg ik': '左足ik',
  'left foot ik': '左足ik',
  'left ankle ik': '左足ik',
  'l leg ik': '左足ik',
  'l foot ik': '左足ik',
  'l ankle ik': '左足ik',
  'right toe ik': '右つま先ik',
  'left toe ik': '左つま先ik',
  'r toe ik': '右つま先ik',
  'l toe ik': '左つま先ik',
  '右足ik': '右足ik',
  '左足ik': '左足ik',
  '右つま先ik': '右つま先ik',
  '左つま先ik': '左つま先ik'
}

const sep = '[\\s._-]*'
const sidePatterns = [
  { pattern: '(?:r|right)', prefix: '右' },
  { pattern: '(?:l|left)', prefix: '左' }
]
const partPatterns = [
  { pattern: 'knee', suffix: 'ひざ', ikSuffix: 'ひざik' },
  { pattern: '(?:leg|foot)', suffix: '足', ikSuffix: '足ik' },
  { pattern: 'ankle', suffix: '足首', ikSuffix: '足ik' },
  { pattern: '(?:toe(?:' + sep + 'tip)?|foottip)', suffix: 'つま先', ikSuffix: 'つま先ik' }
]
const boneNameRegexes = []
sidePatterns.forEach(s => {
  partPatterns.forEach(p => {
    boneNameRegexes.push(
      { regex: new RegExp(`^${s.pattern}${sep}${p.pattern}$`), value: s.prefix + p.suffix },
      { regex: new RegExp(`^${p.pattern}${sep}${s.pattern}$`), value: s.prefix + p.suffix },
      {
        regex: new RegExp(`^${s.pattern}${sep}${p.pattern}${sep}ik$`),
        value: s.prefix + p.ikSuffix
      },
      {
        regex: new RegExp(`^${p.pattern}${sep}ik${sep}${s.pattern}$`),
        value: s.prefix + p.ikSuffix
      }
    )
  })
})

export function normalizeBoneName(name) {
  if (typeof name !== 'string') return name
  const n = name.normalize('NFKC').toLowerCase()
  const alias = boneNameAliases[n]
  if (alias) return alias
  for (const { regex, value } of boneNameRegexes) {
    if (regex.test(n)) return value
  }
  return n
}

function normalizeChain(chain) {
  return {
    ...chain,
    target: normalizeBoneName(chain.target),
    effector: normalizeBoneName(chain.effector),
    links: (chain.links || []).map(l =>
      typeof l === 'string' ? normalizeBoneName(l) : l
    )
  }
}

const createBoneIndexMap = bones => {
  const map = new Map(bones.map((b, i) => [normalizeBoneName(b.name), i]))
  ikAliases.forEach((canon, alias) => {
    const idx = map.get(canon)
    if (typeof idx === 'number') {
      map.set(alias, idx)
    } else {
      console.warn('createBoneIndexMap: 未定義のボーン名', canon)
      ikWarning.value ||=
        `ボーン「${canon}」が見つかりません。ik-config.json の aliases に追加してください`
    }
  })
  return map
}

function inferIKChainsFromStructure(bones) {
  const chains = []
  bones.forEach((knee, kneeIdx) => {
    const ankleIdx = bones.findIndex(b => b.parent === knee)
    if (ankleIdx === -1) return
    const toeIdx = bones.findIndex(b => b.parent === bones[ankleIdx])
    if (toeIdx === -1) return
    const kneePos = bones[kneeIdx]?.position || new THREE.Vector3()
    const anklePos = bones[ankleIdx]?.position || new THREE.Vector3()
    const toePos = bones[toeIdx]?.position || new THREE.Vector3()
    if (kneePos.y <= anklePos.y || anklePos.y <= toePos.y) return
    chains.push({
      target: toeIdx,
      effector: toeIdx,
      links: [{ index: ankleIdx }, { index: kneeIdx }]
    })
  })
  return chains
}

function resolveIKLinks(
  iks,
  bones,
  boneIndexMap = createBoneIndexMap(bones)
) {
  const resolve = v => {
    if (typeof v === 'number') return v
    const norm = normalizeBoneName(v)
    const canon = ikAliases.get(norm) || norm
    return boneIndexMap.get(canon)
  }
  const nameOf = v => {
    if (typeof v === 'object' && v !== null && 'index' in v) return nameOf(v.index)
    if (typeof v === 'number') return bones[v]?.name || v
    return v
  }
  const guessed = []
  return (Array.isArray(iks) ? iks : []).reduce((acc, ik) => {
    const target = resolve(ik.target)
    const effector = resolve(ik.effector)
    if (typeof target !== 'number' || typeof effector !== 'number') {
      if (guessed.length === 0) guessed.push(...inferIKChainsFromStructure(bones))
      if (guessed.length > 0) {
        guessed.forEach(g => acc.push(g))
      } else {
        console.warn('getIKDefinitions: unresolved bone in chain', {
          target: nameOf(ik.target),
          effector: nameOf(ik.effector)
        })
        const miss =
          typeof target !== 'number' ? nameOf(ik.target) : nameOf(ik.effector)
        ikWarning.value ||=
          `IKを自動推測できません。${miss} を ik-config.json の extraIKChains に追加してください`
      }
      return acc
    }
    const links = (ik.links || [])
      .map(l => {
        const idx =
          typeof l === 'object' && l !== null && 'index' in l
            ? resolve(l.index)
            : resolve(l)
        if (typeof idx !== 'number') {
          console.warn('getIKDefinitions: unresolved bone in link', {
            link: nameOf(l),
            chainTarget: bones[target]?.name || target
          })
          const miss = nameOf(l)
          if (miss)
            ikWarning.value ||=
              `ボーン「${miss}」が見つかりません。ik-config.json の aliases に追加してください`
          return null
        }
        return (
          typeof l === 'object' && l !== null && 'index' in l
            ? { ...l, index: idx }
            : { index: idx }
        )
      })
      .filter(Boolean)
    // Reorder links to follow actual parent chain from effector upwards.
    // CCDIKSolver expects effector to be a child of links[0], links[i] a child of links[i+1], etc.
    if (links.length > 0) {
      const candidateSet = new Set(links.map(x => x.index))
      const ordered = []
      const ancestors = []
      let cur = bones[effector]?.parent || null
      while (cur) {
        const idx = bones.indexOf(cur)
        if (idx === -1) break
        ancestors.push(idx)
        if (candidateSet.has(idx)) {
          const found = links.find(x => x.index === idx)
          if (found) ordered.push(found)
        }
        cur = cur.parent || null
      }
      if (ordered.length > 0) {
        // replace with ordered chain; drop non-parental entries (e.g., toe EX)
        links.splice(0, links.length, ...ordered)
      }
      // Ensure the first link is the immediate parent of effector.
      const parentIdx = ancestors[0]
      if (typeof parentIdx === 'number') {
        if (links.length === 0) {
          links.push({ index: parentIdx })
        } else if (links[0].index !== parentIdx) {
          const existing = links.find(l => l.index === parentIdx)
          if (existing) {
            // Move to front
            const rest = links.filter(l => l !== existing)
            links.splice(0, links.length, existing, ...rest)
          } else {
            // Insert missing immediate parent
            links.unshift({ index: parentIdx })
          }
        }
      }
      // Ensure each link's immediate parent appears next in the chain.
      for (let i = 0; i < links.length - 1; i++) {
        const parent = bones[links[i].index]?.parent
        const expectedIdx = parent ? bones.indexOf(parent) : -1
        if (expectedIdx === -1) continue
        if (links[i + 1].index === expectedIdx) continue
        const existingIdx = links.findIndex(
          (l, idx) => idx > i && l.index === expectedIdx
        )
        if (existingIdx !== -1) {
          const [existing] = links.splice(existingIdx, 1)
          links.splice(i + 1, 0, existing)
        } else {
          links.splice(i + 1, 0, { index: expectedIdx })
        }
      }
      // Finally, drop any link not on the ancestor path to keep adjacency.
      if (links.length > 0 && ancestors.length > 0) {
        const ancestorSet = new Set(ancestors)
        const filtered = links.filter(l => ancestorSet.has(l.index))
        if (filtered.length > 0) links.splice(0, links.length, ...filtered)
      }
    }
    console.debug('resolveIKLinks:', {
      target: bones[target]?.name || target,
      links: links.map(l => bones[l.index]?.name || l.index)
    })
    if (links.length === 0) {
      console.warn('getIKDefinitions: chain has no valid links', {
        target: bones[target]?.name || target
      })
      return acc
    }
    acc.push({ target, effector, links })
    return acc
  }, [])
}

function createDefaultIKChains(bones) {
  return bones.reduce((acc, bone, idx) => {
    const parent = bone.parent ? bones.indexOf(bone.parent) : -1
    if (parent !== -1) {
      acc.push({ target: idx, effector: idx, links: [{ index: parent }] })
    }
    return acc
  }, [])
}

  export function getIKDefinitions(geometry, modelName = '') {
    const bones = geometry?.userData?.MMD?.bones || []
    const boneIndexMap = createBoneIndexMap(bones)
    let iks = geometry?.userData?.MMD?.iks
    let hasPMXIKs = Array.isArray(iks) && iks.length > 0
    if (!hasPMXIKs) {
      iks = findUserDataIKs(geometry)
      if (Array.isArray(iks) && iks.length > 0) {
        geometry.userData = geometry.userData || {}
        geometry.userData.MMD = geometry.userData.MMD || {}
        geometry.userData.MMD.iks = iks
        hasPMXIKs = true
      } else {
        iks = []
      }
    }
    iks = resolveIKLinks(iks, bones, boneIndexMap)
    iks = applyFallbackIKs(iks, bones, modelName, boneIndexMap, hasPMXIKs)
    const originalCount = iks.length
    iks = resolveIKLinks(iks, bones, boneIndexMap)
    attachIKParents(bones, iks, boneIndexMap)
    iks = resolveIKLinks(iks, bones, boneIndexMap)
    if (hasPMXIKs && originalCount > iks.length) {
      console.warn(
        'getIKDefinitions: invalid IK chain detected in PMX; please fix the file'
      )
      ikWarning.value ||= '一部のIKチェーンが無効です。PMXファイルを修正してください'
    }
    if (iks.length === 0) {
      ikWarning.value =
        originalCount > 0
          ? 'IK定義が不完全のためデフォルトIKを生成しました'
          : 'IK定義が見つからずデフォルトIKを生成しました'
      iks = createDefaultIKChains(bones)
    } else if (!hasPMXIKs) {
      ikWarning.value =
        originalCount > iks.length ? '一部のIKチェーンが無効です' : ''
    }
    geometry.userData = geometry.userData || {}
    geometry.userData.MMD = geometry.userData.MMD || {}
    geometry.userData.MMD.iks = iks
    return iks
  }

export function setupIKTargets(scene, mesh) {
  ikTargets.forEach(t => {
    scene.remove(t.marker)
    t.marker.material?.dispose()
  })
  ikTargets = []
  selectedIK.value = null
  if (!mesh) return
  const bones = mesh.skeleton?.bones || []
  const iks = getIKDefinitions(mesh.geometry, mesh.name)
  const modelChains = extraIKChains[mesh.name] || extraIKChains.default || []
  const targetNames = new Set(
    Array.isArray(iks)
      ? iks
          .map(ik => normalizeBoneName(bones[ik.target]?.name))
          .filter(Boolean)
      : []
  )
  extraIKBoneNames.forEach(name =>
    targetNames.add(normalizeBoneName(name))
  )
  modelChains.forEach(c => {
    const t =
      typeof c.target === 'number' ? bones[c.target]?.name : c.target
    if (t) targetNames.add(normalizeBoneName(t))
  })
  bones.forEach(b => {
    const n = normalizeBoneName(b.name)
    if (typeof n === 'string' && n.endsWith('ik親')) targetNames.add(n)
  })
  const addMarker = (target, chainIndex) => {
    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xff0000,
        depthTest: false,
        depthWrite: false
      })
    )
    marker.renderOrder = 999
    target.getWorldPosition(marker.position)
    ikTargets.push({ target, marker, chainIndex })
    scene.add(marker)
  }
  bones.forEach(bone => {
    const normalizedName = normalizeBoneName(bone.name)
    const isIKParent =
      typeof normalizedName === 'string' && normalizedName.endsWith('ik親')
    const chainIndex = Array.isArray(iks)
      ? iks.findIndex(ik => bones[ik.target] === bone)
      : -1
    if (
      targetNames.has(normalizedName) &&
      (chainIndex >= 0 || isIKParent)
    ) {
      addMarker(bone, chainIndex >= 0 ? chainIndex : null)
    }
  })
  if (!Array.isArray(iks) || iks.length === 0) {
    ikWarning.value ||= 'IK定義が見つかりません。追加IK設定を行ってください'
  }
}

export function updateIKMarkers(camera, renderer, raycaster, skipMatrixUpdate = false) {
  if (!camera || !renderer || ikTargets.length === 0) return
  const visible = showIkMarkers.value
  if (!visible) {
    ikTargets.forEach(t => (t.marker.visible = false))
    return
  }
  const height = renderer.domElement.clientHeight
  if (camera.fov !== cachedFov) {
    cachedFov = camera.fov
    cachedFovRad = THREE.MathUtils.degToRad(cachedFov)
  }
  const fov = cachedFovRad
  let maxScale = 0
  ikTargets.forEach(t => {
    if (!skipMatrixUpdate) t.target.updateMatrixWorld(true)
    t.target.getWorldPosition(t.marker.position)
    const dist = t.marker.position.distanceTo(camera.position)
    const scale = (2 * dist * Math.tan(fov / 2) * IK_MARKER_PIXEL_SIZE) / height
    t.marker.scale.set(scale, scale, scale)
    t.marker.visible = true
    if (scale > maxScale) maxScale = scale
  })
  if (maxScale > 0) {
    const threshold = maxScale / 2
    raycaster.params.Sprite.threshold = threshold
    raycaster.params.Points.threshold = threshold
  }
}

export function initIKSolver(helper, mesh, ensureFloorRigidBody) {
  if (!mesh || !helper) return
  const skinnedMesh = mesh.isSkinnedMesh
    ? mesh
    : mesh.getObjectByProperty('type', 'SkinnedMesh')
  if (!skinnedMesh) {
    console.error('initIKSolver: SkinnedMesh not found for', mesh.name)
    return
  }
  let iks = getIKDefinitions(skinnedMesh.geometry, skinnedMesh.name)
  if (!Array.isArray(iks)) iks = []
  skinnedMesh.geometry.userData.MMD =
    skinnedMesh.geometry.userData.MMD || {}
  skinnedMesh.geometry.userData.MMD.iks = iks
  if (!helper.objects.get(skinnedMesh)) {
    helper.add(skinnedMesh, { physics: true, ik: true, grant: true })
    helper.update(0)
  }
  skinnedMesh.skeleton?.update()
  ensureFloorRigidBody()
}

watch(showIkMarkers, v => {
  ikTargets.forEach(t => (t.marker.visible = v))
})
