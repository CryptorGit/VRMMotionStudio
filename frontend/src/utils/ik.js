import { ref, watch } from 'vue'
import * as THREE from 'three'

// Dev logging helper (dev server captures at /__dev__/log)
const devLog = data => {
  try {
    if (typeof fetch === 'function' && typeof window !== 'undefined') {
      fetch('/__dev__/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'ik', ...data })
      }).catch(() => {})
    }
  } catch {}
}

export const IK_MARKER_PIXEL_SIZE = 16
export const showIkMarkers = ref(true)
export const ikWarning = ref('')
export const selectedIK = ref(null)
export let ikTargets = []
// Runtime arm IK trackers (IKトラッカー) per mesh
export const armIkTrackersByMesh = new WeakMap()

// Config loaded from /ik-config.json (optional)
export const extraIKBoneNames = []
export const extraIKChains = {}
export const ikAliases = new Map()

let cachedCamera = null
let cachedFov = null
let cachedFovRad = 0

// Minimal alias table (extend via ik-config.json)
const boneNameAliases = {
  // Legs
  'right knee': '右ひざ',
  'r knee': '右ひざ',
  'left knee': '左ひざ',
  'l knee': '左ひざ',
  'right foot': '右足',
  'r foot': '右足',
  'left foot': '左足',
  'l foot': '左足',
  'right ankle': '右足首',
  'left ankle': '左足首',
  'right toe': '右つま先',
  'left toe': '左つま先',
  // Arms / hands
  'right elbow': '右ひじ',
  'r elbow': '右ひじ',
  'left elbow': '左ひじ',
  'l elbow': '左ひじ',
  'right arm': '右腕',
  'r arm': '右腕',
  'left arm': '左腕',
  'l arm': '左腕',
  'right wrist': '右手首',
  'r wrist': '右手首',
  'left wrist': '左手首',
  'l wrist': '左手首',
  'right shoulder': '右肩',
  'left shoulder': '左肩'
}
const boneNameRegexes = [
  { regex: /^(lefthandik|lhandik)$/, value: '左手ＩＫ' },
  { regex: /^(righthandik|rhandik)$/, value: '右手ＩＫ' },
  { regex: /^(leftlegik|llegik)$/, value: '左足ＩＫ' },
  { regex: /^(rightlegik|rlegik)$/, value: '右足ＩＫ' },
  { regex: /^(leftwrist|lwrist)$/, value: '左手首' },
  { regex: /^(rightwrist|rwrist)$/, value: '右手首' },
  { regex: /^(leftelbow|lelbow)$/, value: '左ひじ' },
  { regex: /^(rightelbow|relbow)$/, value: '右ひじ' },
  { regex: /^(leftarm|luparm|upperarm_l)$/, value: '左腕' },
  { regex: /^(rightarm|ruparm|upperarm_r)$/, value: '右腕' },
  { regex: /^(leftshoulder|clavicle_l)$/, value: '左肩' },
  { regex: /^(rightshoulder|clavicle_r)$/, value: '右肩' }
]
const linkIgnoreRegex = /(d)$/

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
    console.warn('Failed to load IK config; using minimal defaults', e)
    if (Object.keys(extraIKChains).length === 0) extraIKChains.default = []
  }
}
export const ikConfigPromise = loadIKConfig()

export function normalizeBoneName(name) {
  if (typeof name !== 'string') return name
  // NFKC to collapse full-width to half-width, then lower-case
  // Also remove common separators (space, _, -, ・) to normalize variants like "IK 親"/"IK・親"
  const n = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-・]/g, '')
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
    links: (chain.links || [])
      .map(l => (typeof l === 'string' ? normalizeBoneName(l) : l))
      .filter(l => typeof l !== 'string' || !linkIgnoreRegex.test(l))
  }
}

const createBoneIndexMap = bones => {
  const map = new Map(bones.map((b, i) => [normalizeBoneName(b.name), i]))
  ikAliases.forEach((canon, alias) => {
    const idx = map.get(canon)
    if (typeof idx === 'number') {
      map.set(alias, idx)
    } else {
      // Quietly ignore missing canonical names (models differ)
      if (import.meta?.env?.DEV) try { console.debug('createBoneIndexMap: skip alias; canonical missing', canon) } catch {}
    }
  })
  return map
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
    chains.push({ target: toeIdx, effector: toeIdx, links: [{ index: ankleIdx }, { index: kneeIdx }] })
  })
  return chains
}

function applyFallbackIKs(
  iks,
  bones,
  modelName,
  boneIndexMap = createBoneIndexMap(bones),
  hasPMXIKs = false
) {
  let result = Array.isArray(iks) ? [...iks] : []
  // If no IKs from PMX/userData, try model-specific/default fallbacks
  if (result.length === 0) {
    const fallback = extraIKChains[modelName] || extraIKChains.default
    if (Array.isArray(fallback) && fallback.length > 0) {
      result = fallback.map(ik => ({ ...ik }))
    }
  }
  const fallbackChains = extraIKChains[modelName] || extraIKChains.default || []
  // Ensure every requested extra IK target appears at least once
  extraIKBoneNames.forEach(name => {
    const idx = boneIndexMap.get(normalizeBoneName(name))
    if (typeof idx !== 'number') return
    const exists = result.some(ik => {
      const target = typeof ik.target === 'number' ? ik.target : boneIndexMap.get(normalizeBoneName(ik.target))
      return target === idx
    })
    if (exists) return
    const chain = fallbackChains.find(c => normalizeBoneName(c.target) === normalizeBoneName(name))
    if (chain) result.push({ ...chain })
  })
  // Resolve names to indices and dedupe by target
  result = resolveIKLinks(result, bones, boneIndexMap)
  const seenTargets = new Set()
  result = result.filter(ik => {
    const targetName = typeof ik.target === 'number' ? normalizeBoneName(bones[ik.target]?.name) : normalizeBoneName(ik.target)
    if (!targetName) return true
    if (seenTargets.has(targetName)) return false
    seenTargets.add(targetName)
    return true
  })
  return result
}

function resolveIKLinks(iks, bones, boneIndexMap = createBoneIndexMap(bones)) {
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
          target: nameOf(ik.target), effector: nameOf(ik.effector)
        })
        const miss = typeof target !== 'number' ? nameOf(ik.target) : nameOf(ik.effector)
        ikWarning.value ||= `IKを解決できません。${miss} を ik-config.json に追加してください`
      }
      return acc
    }
    const links = (ik.links || [])
      .map(l => {
        const idx = (typeof l === 'object' && l !== null && 'index' in l) ? resolve(l.index) : resolve(l)
        if (typeof idx !== 'number') {
          console.warn('getIKDefinitions: unresolved bone in link', { link: nameOf(l), chainTarget: bones[target]?.name || target })
          const miss = nameOf(l)
          if (miss) ikWarning.value ||= `ボーン「${miss}」が見つかりません。ik-config.json の aliases に追加してください`
          return null
        }
        const linkName = normalizeBoneName(bones[idx]?.name)
        if (typeof linkName === 'string' && linkIgnoreRegex.test(linkName)) return null
        return (typeof l === 'object' && l !== null && 'index' in l) ? { ...l, index: idx } : { index: idx }
      })
      .filter(Boolean)

    // Reorder links to follow actual parent chain from effector upwards.
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
      if (ordered.length > 0) links.splice(0, links.length, ...ordered)
      const parentIdx = ancestors[0]
      if (typeof parentIdx === 'number') {
        if (links.length === 0) {
          links.push({ index: parentIdx })
        } else if (links[0].index !== parentIdx) {
          const existing = links.find(l => l.index === parentIdx)
          if (existing) {
            const rest = links.filter(l => l !== existing)
            links.splice(0, links.length, existing, ...rest)
          } else {
            links.unshift({ index: parentIdx })
          }
        }
      }
      for (let i = 0; i < links.length - 1; i++) {
        const parent = bones[links[i].index]?.parent
        const expectedIdx = parent ? bones.indexOf(parent) : -1
        if (expectedIdx === -1) continue
        if (links[i + 1].index === expectedIdx) continue
        const existingIdx = links.findIndex((l, idx) => idx > i && l.index === expectedIdx)
        if (existingIdx !== -1) {
          const [existing] = links.splice(existingIdx, 1)
          links.splice(i + 1, 0, existing)
        } else {
          links.splice(i + 1, 0, { index: expectedIdx })
        }
      }
      if (links.length > 0 && ancestors.length > 0) {
        const ancestorSet = new Set(ancestors)
        const filtered = links.filter(l => ancestorSet.has(l.index))
        if (filtered.length > 0) links.splice(0, links.length, ...filtered)
      }
    }

    const dbg = { target: bones[target]?.name || target, links: links.map(l => bones[l.index]?.name || l.index) }
    console.debug('resolveIKLinks:', dbg)
    try { devLog({ event: 'ik:resolve', ...dbg }) } catch {}
    if (links.length === 0) {
      console.warn('getIKDefinitions: chain has no valid links', { target: bones[target]?.name || target })
      return acc
    }
    acc.push({ target, effector, links })
    return acc
  }, [])
}

// Accept IK parent bones that are ancestors (not only immediate parents)
export function attachIKParentsSafe(bones, iks, boneIndexMap = createBoneIndexMap(bones)) {
  const suffix = normalizeBoneName('ik親')
  const endsWithIkParent = n => typeof n === 'string' && n.endsWith(suffix)
  const isAncestor = (ancIdx, descIdx) => {
    let cur = bones[descIdx]?.parent || null
    while (cur) {
      if (bones[ancIdx] === cur) return true
      cur = cur.parent || null
    }
    return false
  }
  bones.forEach((b, idx) => {
    const norm = normalizeBoneName(b.name)
    if (!endsWithIkParent(norm)) return
    const base = norm.slice(0, -suffix.length) + 'ik'
    const targetIdx = boneIndexMap.get(base)
    const chain = iks.find(ik => ik.target === targetIdx)
    if (!chain) return
    const existingPos = chain.links.findIndex(l => l.index === idx)
    let existingLink = null
    if (existingPos !== -1) existingLink = chain.links.splice(existingPos, 1)[0]
    const targetParent = bones[targetIdx]?.parent
    if (bones[idx] === targetParent) {
      chain.links.unshift({ index: idx })
    } else {
      const childPos = chain.links.findIndex(l => bones[l.index]?.parent === bones[idx])
      if (childPos === -1) {
        const anyDescendant = isAncestor(idx, targetIdx) || chain.links.some(l => isAncestor(idx, l.index))
        if (anyDescendant) {
          chain.links.unshift({ index: idx })
        } else {
          if (existingLink) chain.links.splice(existingPos, 0, existingLink)
          return
        }
      }
      if (childPos > 0) {
        const [child] = chain.links.splice(childPos, 1)
        chain.links.unshift(child)
      }
      chain.links.unshift({ index: idx })
    }
    const [resolved] = resolveIKLinks([chain], bones, boneIndexMap)
    if (resolved) chain.links.splice(0, chain.links.length, ...resolved.links)
  })
  const resolved = resolveIKLinks(iks, bones, boneIndexMap)
  iks.splice(0, iks.length, ...resolved)
  return iks
}

function createDefaultIKChains(bones) {
  return bones.reduce((acc, bone, idx) => {
    const parent = bone.parent ? bones.indexOf(bone.parent) : -1
    if (parent !== -1) acc.push({ target: idx, effector: idx, links: [{ index: parent }] })
    return acc
  }, [])
}

export function getIKDefinitions(geometry, modelName = '') {
  const bones = geometry?.userData?.MMD?.bones || []
  const boneIndexMap = createBoneIndexMap(bones)
  let iks = geometry?.userData?.MMD?.iks
  let hasPMXIKs = Array.isArray(iks) && iks.length > 0
  try { devLog({ event: 'ik:get:start', model: modelName, bones: bones.length, hasPMXIKs }) } catch {}
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
  try { devLog({ event: 'ik:get:post-fallback', count: originalCount }) } catch {}
  iks = resolveIKLinks(iks, bones, boneIndexMap)
  attachIKParentsSafe(bones, iks, boneIndexMap)
  iks = resolveIKLinks(iks, bones, boneIndexMap)
  if (hasPMXIKs && originalCount > iks.length) {
    console.warn('getIKDefinitions: invalid IK chain detected in PMX; please fix the file')
    try { devLog({ event: 'ik:get:invalid-pmx', before: originalCount, after: iks.length }) } catch {}
    ikWarning.value ||= 'PMX内のIKチェーンに不整合があります。ファイルの修正を検討してください'
  }
  if (iks.length === 0) {
    ikWarning.value = originalCount > 0
      ? '一部のIKチェーンを構築できませんでした'
      : 'IKチェーンが見つかりませんでした'
    iks = createDefaultIKChains(bones)
    try { devLog({ event: 'ik:get:created-default', count: iks.length }) } catch {}
  }
  geometry.userData = geometry.userData || {}
  geometry.userData.MMD = geometry.userData.MMD || {}
  geometry.userData.MMD.iks = iks
  try { devLog({ event: 'ik:get:done', count: iks.length }) } catch {}
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
    Array.isArray(iks) ? iks.map(ik => normalizeBoneName(bones[ik.target]?.name)).filter(Boolean) : []
  )
  extraIKBoneNames.forEach(name => targetNames.add(normalizeBoneName(name)))
  modelChains.forEach(c => {
    const t = typeof c.target === 'number' ? bones[c.target]?.name : c.target
    if (t) targetNames.add(normalizeBoneName(t))
  })
  const addMarker = (target, chainIndex) => {
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff0000, depthTest: false, depthWrite: false }))
    marker.renderOrder = 999
    target.getWorldPosition(marker.position)
    ikTargets.push({ target, marker, chainIndex })
    scene.add(marker)
  }
  const isIkParentName = n => typeof n === 'string' && /ik親$/.test(n)
  bones.forEach(bone => {
    const normalizedName = normalizeBoneName(bone.name)
    const chainIndex = Array.isArray(iks) ? iks.findIndex(ik => bones[ik.target] === bone) : -1
    if (targetNames.has(normalizedName) || chainIndex >= 0 || isIkParentName(normalizedName)) {
      addMarker(bone, chainIndex >= 0 ? chainIndex : null)
    }
  })
  if (!Array.isArray(iks) || iks.length === 0) {
    ikWarning.value ||= 'IKチェーンが検出されませんでした（マーカーは表示されません）'
  }

  // Ensure arm IK trackers (IKトラッカー) for wrists lacking PMX IK chains
  try {
    ensureArmTrackers(scene, mesh, iks)
    const trackers = armIkTrackersByMesh.get(mesh) || []
    for (const t of trackers) addMarker(t.tracker, null)
  } catch (e) {
    console.warn('setupIKTargets: ensureArmTrackers failed', e)
  }
}

function findBoneByName(bones, name) {
  const n = normalizeBoneName(name)
  return bones.find(b => normalizeBoneName(b.name) === n) || null
}

function hasArmIKChainForWrist(bones, iks, wristIdx) {
  if (!Array.isArray(iks)) return false
  return iks.some(ik => {
    const eff = typeof ik.effector === 'number' ? ik.effector : -1
    if (eff !== wristIdx) return false
    const linkIndices = (ik.links || []).map(l => l.index)
    // Require elbow and upper arm in links
    const wrist = bones[wristIdx]
    const elbow = wrist?.parent
    const upper = elbow?.parent
    return elbow && upper && linkIndices.includes(bones.indexOf(elbow)) && linkIndices.includes(bones.indexOf(upper))
  })
}

function isTwistBone(name) {
  const n = normalizeBoneName(name)
  return typeof n === 'string' && (n.includes('捩') || n.includes('twist'))
}

function categorize(name) {
  const n = normalizeBoneName(name)
  if (typeof n !== 'string') return 'unknown'
  if (n.includes('手首') || n.includes('wrist')) return 'wrist'
  if (n.includes('ひじ') || n.includes('肘') || n.includes('前腕') || n.includes('forearm') || n.includes('lowerarm')) return 'elbow'
  if (n.includes('腕') || n.includes('upperarm') || n === 'arm') return 'arm'
  if (n.includes('肩') || n.includes('shoulder') || n.includes('clavicle') || n.includes('collar') || n.includes('鎖骨')) return 'shoulder'
  if (isTwistBone(n)) return 'twist'
  return 'unknown'
}

export function ensureArmTrackers(scene, mesh, iks) {
  if (!mesh || !mesh.skeleton) return
  const bones = mesh.skeleton.bones
  const trackers = []
  const prev = armIkTrackersByMesh.get(mesh) || []
  // Remove old trackers
  prev.forEach(t => { try { t.tracker.parent?.remove(t.tracker) } catch {} })

  const boneDatas = mesh.geometry?.userData?.MMD?.bones || []
  const getData = bone => boneDatas[bones.indexOf(bone)] || {}
  function isTwistObj(b) {
    const d = getData(b)
    const nameTwist = isTwistBone(b?.name)
    const grantTwist = !!(d?.grant?.affectRotation) && !d?.grant?.affectPosition
    const axisMarked = !!(d?.fixAxis || (d?.localXVector && d?.localZVector))
    return nameTwist || (grantTwist && axisMarked)
  }
  function isHelperObj(b) {
    const n = normalizeBoneName(b?.name)
    if (typeof n !== 'string') return false
    // Common helper/control suffixes and names
    if (n.endsWith('親') || n.endsWith('先') || /ik親$/.test(n)) return true
    if (n.includes('target') || n.includes('control') || n.includes('ctrl')) return true
    // Shoulder-specific helper like 肩P/肩C (parent/control), and aliases
    if (/(肩|shoulder|clavicle|collar|鎖骨)[pc]$/.test(n)) return true
    return false
  }

  function buildChainFromWrist(wrist) {
    let cur = wrist?.parent
    const ancestors = []
    let guard = 0
    while (cur && cur.isBone && guard++ < 40) {
      if (!isTwistObj(cur) && !isHelperObj(cur)) ancestors.push(cur)
      cur = cur.parent
    }
    if (ancestors.length === 0) return null
    // Prefer semantic categories, then fallback by topology
    let elbow = null, arm = null, shoulder = null
    for (const b of ancestors) {
      const cat = categorize(b.name)
      if (!elbow && cat === 'elbow') { elbow = b; continue }
      if (elbow && !arm && cat === 'arm') { arm = b; continue }
      if (arm && !shoulder && cat === 'shoulder') { shoulder = b; break }
    }
    // If shoulder wasn't found yet, choose the ancestor that is the direct parent of arm
    if (!shoulder && arm) {
      const parentOfArm = arm.parent
      if (ancestors.includes(parentOfArm)) shoulder = parentOfArm
    }
    // Topology fallback
    if (!elbow) elbow = ancestors[0] || null
    if (!arm) arm = ancestors.find(a => a !== elbow) || null
    if (!shoulder) shoulder = ancestors.find(a => a !== elbow && a !== arm) || null
    // Require少なくとも ひじ・腕 が存在
    if (!elbow || !arm) return null
    return { shoulder, arm, elbow }
  }

  function createFor(side) {
    const wrist = findBoneByName(bones, side === 'L' ? '左手首' : '右手首')
    if (!wrist) return null
    const wristIdx = bones.indexOf(wrist)
    if (hasArmIKChainForWrist(bones, iks, wristIdx)) return null
    const chain = buildChainFromWrist(wrist)
    if (!chain) return null
    // compute target position: prefer middle finger first segment (中指１)
    function findDescendantBy(pred, root, maxDepth = 5) {
      const q = [{ n: root, d: 0 }]
      const seen = new Set()
      while (q.length) {
        const { n, d } = q.shift()
        if (!n || seen.has(n) || d > maxDepth) continue
        seen.add(n)
        if (pred(n)) return n
        for (const c of n.children) if (c && c.isBone) q.push({ n: c, d: d + 1 })
      }
      return null
    }
    const sidePrefix = side === 'L' ? '左' : '右'
    const middle1 = findDescendantBy(
      b => {
        const nb = normalizeBoneName(b.name)
        return typeof nb === 'string' && nb.includes('中指') && (nb.includes('1') || nb.includes('１')) && (!sidePrefix || nb.startsWith(normalizeBoneName(sidePrefix)))
      },
      wrist,
      6
    )
    // compute wrist tip world position for initial tracker placement
    const tipWorld = (() => {
      if (middle1) return middle1.getWorldPosition(new THREE.Vector3())
      // Prefer first bone child (e.g., finger root)
      const childBone = wrist.children.find(c => c && c.isBone)
      if (childBone) {
        return childBone.getWorldPosition(new THREE.Vector3())
      }
      // Try PMX connectIndex
      try {
        const d = getData(wrist)
        const idx = typeof d?.connectIndex === 'number' ? d.connectIndex : -1
        if (idx >= 0 && bones[idx]) return bones[idx].getWorldPosition(new THREE.Vector3())
      } catch {}
      // Fallback: offset along local Y axis by small length
      const base = wrist.getWorldPosition(new THREE.Vector3())
      const y = new THREE.Vector3(0, 1, 0)
      const dir = y.applyQuaternion(wrist.getWorldQuaternion(new THREE.Quaternion())).normalize()
      return base.add(dir.multiplyScalar(0.2))
    })()
    // Create IK親（Arm IK root） aligned like wrist parent, but not parented to the arm chain
    const ikRoot = new THREE.Object3D()
    ikRoot.name = `${side === 'L' ? '左' : '右'}手ＩＫ親`
    mesh.add(ikRoot)
    // Match wrist.parent world transform
    const parentBone = wrist.parent || mesh
    const parentWorldPos = parentBone.getWorldPosition(new THREE.Vector3())
    const parentWorldQuat = parentBone.getWorldQuaternion(new THREE.Quaternion())
    const invMeshMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
    const invMeshQuat = mesh.getWorldQuaternion(new THREE.Quaternion()).invert()
    ikRoot.position.copy(parentWorldPos.clone().applyMatrix4(invMeshMat))
    ikRoot.quaternion.copy(invMeshQuat.clone().multiply(parentWorldQuat))
    ikRoot.updateMatrixWorld(true)

    // Create tracker under IK親, positioned at wrist tip in ikRoot local space
    const tracker = new THREE.Object3D()
    tracker.name = `${wrist.name || (side === 'L' ? '左手首' : '右手首')}_IK_TRACKER`
    ikRoot.add(tracker)
    tracker.position.copy(tipWorld.clone().applyMatrix4(new THREE.Matrix4().copy(ikRoot.matrixWorld).invert()))
    tracker.updateMatrixWorld(true)
    // effector: prefer middle1 if found, else wrist (最終到達点)
    const effector = middle1 || wrist
    return { side, wrist, effector, tracker, ikRoot, ...chain }
  }

  const left = createFor('L'); if (left) trackers.push(left)
  const right = createFor('R'); if (right) trackers.push(right)
  armIkTrackersByMesh.set(mesh, trackers)
  return trackers
}

// Solve arm IK for IKトラッカー chains (shoulder->arm->elbow->wrist)
export function solveArmIKTrackers(mesh, iterations = 48, maxStep = 0.25) {
  const trackers = armIkTrackersByMesh.get(mesh)
  if (!Array.isArray(trackers) || trackers.length === 0) return
  for (const t of trackers) {
    const { shoulder, arm, elbow, wrist, effector, tracker } = t
    const eff = effector || wrist
    if (!arm || !elbow || !wrist || !eff || !tracker) continue
    const wristStep = maxStep * 0.35
    const elbowStep = maxStep
    const armStep = maxStep
    const shoulderStep = maxStep
    for (let i = 0; i < iterations; i++) {
      // Distal to proximal: include wrist so 手首も回る
      ccdStep(mesh, wrist, eff, tracker, wristStep)
      ccdStep(mesh, elbow, eff, tracker, elbowStep)
      ccdStep(mesh, arm, eff, tracker, armStep)
      if (shoulder) ccdStep(mesh, shoulder, eff, tracker, shoulderStep)
      // Early exit when effector is close to target
      const dist = eff.getWorldPosition(_v1).distanceTo(tracker.getWorldPosition(_v2))
      if (i > 12 && dist < 1e-3) break
    }
    // 手首の姿勢はチェーン解＋付与に委ねる（MMD準拠）
  }
  try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3()
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion()

function toArray3(v) {
  if (!v) return null
  if (Array.isArray(v)) return v
  if (typeof v === 'object' && v !== null && 'x' in v && 'y' in v && 'z' in v) return [v.x, v.y, v.z]
  return null
}
function degToRadIfNeeded(arr) {
  if (!arr) return null
  const absMax = Math.max(...arr.map(a => Math.abs(a ?? 0)))
  if (absMax > Math.PI * 1.05) return arr.map(a => (a ?? 0) * Math.PI / 180)
  return arr
}
function getBoneLimits(mesh, bone) {
  try {
    const bonesData = mesh.geometry?.userData?.MMD?.bones || []
    const idx = mesh.skeleton?.bones?.indexOf(bone)
    const data = idx >= 0 ? bonesData[idx] : null
    const min = degToRadIfNeeded(toArray3(data?.rotationMin) || toArray3(data?.rotMin) || toArray3(data?.angleMin) || toArray3(data?.limitMin))
    const max = degToRadIfNeeded(toArray3(data?.rotationMax) || toArray3(data?.rotMax) || toArray3(data?.angleMax) || toArray3(data?.limitMax))
    if (min && max) return { min, max }
  } catch {}
  const n = (bone?.name || '').toLowerCase()
  if (/(ひじ|elbow)/.test(n)) return { min: [-0.05, -0.02, -0.02], max: [2.6, 0.02, 0.02] }
  if (/(腕|upperarm|arm)/.test(n)) return { min: [-1.0, -1.0, -1.0], max: [1.0, 1.0, 1.0] }
  if (/(肩|shoulder|clavicle)/.test(n)) return { min: [-0.7, -0.7, -0.7], max: [0.7, 0.7, 0.7] }
  return { min: [-Math.PI, -Math.PI, -Math.PI], max: [Math.PI, Math.PI, Math.PI] }
}
function clampBoneToLimits(bone, limits) {
  if (!limits) return
  const order = bone.rotation.order || 'XYZ'
  const e = new THREE.Euler().setFromQuaternion(bone.quaternion, order)
  const { min, max } = limits
  const nx = THREE.MathUtils.clamp(e.x, min[0], max[0])
  const ny = THREE.MathUtils.clamp(e.y, min[1], max[1])
  const nz = THREE.MathUtils.clamp(e.z, min[2], max[2])
  if (nx !== e.x || ny !== e.y || nz !== e.z) {
    e.set(nx, ny, nz, order)
    bone.quaternion.setFromEuler(e)
  }
}
function ccdStep(mesh, bone, effector, targetObj, maxStep) {
  bone.updateMatrixWorld(true); effector.updateMatrixWorld(true); targetObj.updateMatrixWorld(true)
  const bp = bone.getWorldPosition(_v1)
  const ep = effector.getWorldPosition(_v2)
  const tp = targetObj.getWorldPosition(_v3)
  const vEff = ep.sub(bp).normalize()
  const vTar = tp.sub(bp).normalize()
  const dot = THREE.MathUtils.clamp(vEff.dot(vTar), -1, 1)
  let angle = Math.acos(dot)
  if (!isFinite(angle) || angle < 1e-5) return
  angle = Math.min(angle, maxStep)
  const axis = new THREE.Vector3().crossVectors(vEff, vTar)
  if (axis.lengthSq() < 1e-10) return
  axis.normalize()
  const parent = bone.parent
  const parentWorldQuat = parent ? parent.getWorldQuaternion(_q1) : _q1.identity()
  const boneWorldQuat = bone.getWorldQuaternion(_q2)
  const deltaWorld = new THREE.Quaternion().setFromAxisAngle(axis, angle)
  const newBoneWorld = deltaWorld.multiply(boneWorldQuat)
  const parentInv = _q1.copy(parentWorldQuat).invert()
  bone.quaternion.copy(parentInv.multiply(newBoneWorld)).normalize()
  bone.updateMatrixWorld(true)
}

export function updateIKMarkers(camera, renderer, raycaster, skipMatrixUpdate = false) {
  if (!camera || !renderer || ikTargets.length === 0) return
  const visible = showIkMarkers.value
  if (!visible) {
    ikTargets.forEach(t => (t.marker.visible = false))
    return
  }
  const height = renderer.domElement.clientHeight
  if (height <= 0) return
  if (camera !== cachedCamera || camera.fov !== cachedFov) {
    cachedCamera = camera
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

export async function initIKSolver(helper, mesh, ensureFloorRigidBody, Ammo) {
  if (!mesh || !helper) return
  const skinnedMesh = mesh.isSkinnedMesh ? mesh : mesh.getObjectByProperty('type', 'SkinnedMesh')
  if (!skinnedMesh) {
    console.error('initIKSolver: SkinnedMesh not found for', mesh.name)
    return
  }
  try {
    devLog({ event: 'ik:init', mesh: skinnedMesh.name, ammoArg: !!Ammo, globalAmmo: !!(typeof window !== 'undefined' && window.Ammo) })
  } catch {}
  let iks = getIKDefinitions(skinnedMesh.geometry, skinnedMesh.name)
  if (!Array.isArray(iks)) iks = []
  skinnedMesh.geometry.userData.MMD = skinnedMesh.geometry.userData.MMD || {}
  skinnedMesh.geometry.userData.MMD.iks = iks
  if (!helper.objects.get(skinnedMesh)) {
    if (Ammo || (typeof window !== 'undefined' && window.Ammo)) {
      helper.add(skinnedMesh, { physics: true, ik: true, grant: true })
    } else {
      helper.add(skinnedMesh, { physics: false, ik: true, grant: true })
    }
    helper.update(0)
  }
  skinnedMesh.skeleton?.update()
  ensureFloorRigidBody()
}

watch(showIkMarkers, v => {
  ikTargets.forEach(t => (t.marker.visible = v))
})
