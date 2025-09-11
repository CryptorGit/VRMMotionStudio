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
// While true, user is actively dragging an IK tracker.
export const isDraggingIk = ref(false)
export let ikTargets = []
// Runtime arm IK trackers (IKトラッカー) per mesh
export const armIkTrackersByMesh = new WeakMap()
export const legIkTrackersByMesh = new WeakMap()
export const bodyTrackersByMesh = new WeakMap()

// Helpers for world-space math used by arm IK stabilization
const _tmpV1 = new THREE.Vector3()
const _tmpV2 = new THREE.Vector3()
const _tmpV3 = new THREE.Vector3()
const _tmpM4 = new THREE.Matrix4()
const _tmpQ1 = new THREE.Quaternion()
const _tmpQ2 = new THREE.Quaternion()

function getWorldBasis(obj) {
  // Returns approximate world-space basis vectors for obj: { right, up, forward }
  const q = obj.getWorldQuaternion(_tmpQ1)
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q).normalize()
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q).normalize()
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q).normalize()
  return { right, up, forward }
}

function rotateBoneAroundWorldAxis(bone, axisWorld, angle) {
  if (!bone || !axisWorld || !isFinite(angle)) return
  const parent = bone.parent
  const parentWorldQuat = parent ? parent.getWorldQuaternion(_tmpQ1) : _tmpQ1.identity()
  const boneWorldQuat = bone.getWorldQuaternion(_tmpQ2)
  const deltaWorld = new THREE.Quaternion().setFromAxisAngle(axisWorld, angle)
  const newBoneWorld = deltaWorld.multiply(boneWorldQuat)
  const parentInv = _tmpQ1.copy(parentWorldQuat).invert()
  bone.quaternion.copy(parentInv.multiply(newBoneWorld)).normalize()
  bone.updateMatrixWorld(true)
}
function findTorsoRef(mesh, shoulder) {
  if (shoulder?.parent && shoulder.parent.isBone) return shoulder.parent
  try {
    const bones = mesh?.skeleton?.bones || []
    const left = bones.find(b => /左肩|l_shoulder|clavicle_l|shoulder_l/i.test(b.name))
    const right = bones.find(b => /右肩|r_shoulder|clavicle_r|shoulder_r/i.test(b.name))
    if (left && right && left.parent && left.parent === right.parent) return left.parent
  } catch {}
  return mesh || shoulder || null
}

function lengthBetween(a, b) {
  if (!a || !b) return 0
  return a.getWorldPosition(_tmpV1).distanceTo(b.getWorldPosition(_tmpV2))
}

function computeElbowPoleDir(t) {
  const { shoulder, tracker, torsoRef, side, elbowHint } = t || {}
  if (!shoulder || !tracker) return null
  const S = shoulder.getWorldPosition(_tmpV1)
  const T = tracker.getWorldPosition(_tmpV2)
  const sw = _tmpV3.subVectors(T, S)
  if (sw.lengthSq() < 1e-8) return null
  sw.normalize()
  if (elbowHint) {
    const H = elbowHint.getWorldPosition(new THREE.Vector3())
    const sh = H.sub(S)
    const shProj = sh.clone().sub(sw.clone().multiplyScalar(sh.dot(sw)))
    if (shProj.lengthSq() > 1e-8) return shProj.normalize()
  }
  const basis = getWorldBasis(torsoRef || shoulder)
  const sideSign = side === 'R' ? +1 : -1
  const lat = _tmpV1.copy(basis.right).multiplyScalar(sideSign)
  lat.sub(sw.clone().multiplyScalar(lat.dot(sw)))
  if (lat.lengthSq() < 1e-6) {
    lat.copy(new THREE.Vector3().crossVectors(basis.up, sw))
    if (lat.lengthSq() < 1e-6) lat.set(1 * sideSign, 0, 0)
  }
  lat.normalize()
  return lat
}

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
  // ユーザー要望により、PMX などに含まれる IK チェーンは使用しない
  try { devLog({ event: 'ik:get:disabled', model: modelName }) } catch {}
  return []
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
  // 既存IKボーンへのマーカー追加は行わない
  // PMXのIKは使用しないため、ここでの未検出警告は出さない
  // if (!Array.isArray(iks) || iks.length === 0) { }

  // Ensure arm IK trackers (IKトラッカー) for wrists lacking PMX IK chains
  try {
    ensureArmTrackers(scene, mesh, iks)
    const trackers = armIkTrackersByMesh.get(mesh) || []
    for (const t of trackers) {
      if (t.shoulderTracker) addMarker(t.shoulderTracker, null)
      if (t.elbowTracker) addMarker(t.elbowTracker, null)
      if (t.armTracker) addMarker(t.armTracker, null)
      if (t.handTracker) addMarker(t.handTracker, null)
    }
  } catch (e) {
    console.warn('setupIKTargets: ensureArmTrackers failed', e)
  }
  try {
    ensureLegTrackers(scene, mesh)
    const legs = legIkTrackersByMesh.get(mesh) || []
    for (const t of legs) {
      if (t.kneeTracker) addMarker(t.kneeTracker, null)
      if (t.legTracker) addMarker(t.legTracker, null)
      if (t.footTracker) addMarker(t.footTracker, null)
    }
  } catch (e) { console.warn('setupIKTargets: ensureLegTrackers failed', e) }
  try {
    ensureBodyTrackers(scene, mesh)
    const body = bodyTrackersByMesh.get(mesh)
    if (body) {
      if (body.head) addMarker(body.head, null)
      if (body.chest) addMarker(body.chest, null)
      if (body.hip) addMarker(body.hip, null)
    }
  } catch (e) { console.warn('setupIKTargets: ensureBodyTrackers failed', e) }
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
  prev.forEach(t => { try {
    t.armTracker?.parent?.remove(t.armTracker)
    t.handTracker?.parent?.remove(t.handTracker)
    t.tracker?.parent?.remove(t.tracker)
    t.elbowTracker?.parent?.remove(t.elbowTracker)
    t.shoulderTracker?.parent?.remove(t.shoulderTracker)
    // elbow pole has been deprecated
    if (t.elbowPole) t.elbowPole.parent?.remove(t.elbowPole)
    if (t.elbowPoleLine) { t.elbowPoleLine.parent?.remove(t.elbowPoleLine); try { t.elbowPoleLine.geometry?.dispose(); t.elbowPoleLine.material?.dispose() } catch {} }
    if (t.shoulderElbowLine) { t.shoulderElbowLine.parent?.remove(t.shoulderElbowLine); try { t.shoulderElbowLine.geometry?.dispose(); t.shoulderElbowLine.material?.dispose() } catch {} }
    if (t.elbowArmLine) { t.elbowArmLine.parent?.remove(t.elbowArmLine); try { t.elbowArmLine.geometry?.dispose(); t.elbowArmLine.material?.dispose() } catch {} }
    if (t.armHandLine) { t.armHandLine.parent?.remove(t.armHandLine); try { t.armHandLine.geometry?.dispose(); t.armHandLine.material?.dispose() } catch {} }
  } catch {} })

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
    // 即時の非補助（非Twist/非Helper）祖先を段階的に取得し、
    // 肘（wristの直上）、腕（肘の直上）、肩（腕の直上）を確実に分離して特定する。
    const nextCoreAncestor = start => {
      let cur = start?.parent || null
      let guard = 0
      while (cur && cur.isBone && guard++ < 64) {
        if (!isTwistObj(cur) && !isHelperObj(cur)) return cur
        cur = cur.parent
      }
      return null
    }
    const elbow = nextCoreAncestor(wrist)
    if (!elbow) return null
    const arm = nextCoreAncestor(elbow)
    if (!arm) return { shoulder: null, arm: elbow.parent?.isBone ? elbow.parent : null, elbow }
    const shoulder = nextCoreAncestor(arm)
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
    // 親IKトラッカーは作らず、肩＞肘＞手＞手先の親子関係で配置
    // Shoulder tracker (new root of arm trackers)
    const shoulderTracker = new THREE.Object3D()
    // 要望: 名称は「腕IKトラッカー」（肩の回転を担当）
    shoulderTracker.name = `${side === 'L' ? '左' : '右'}腕_IK_TRACKER`
    mesh.add(shoulderTracker)
    const invMeshMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
    // 配置は「腕（上腕）位置＋わずかな側方オフセット」（指定どおり：肘ではなく腕）
    const armWorldForRoot = (chain.arm || chain.shoulder || wrist).getWorldPosition(new THREE.Vector3())
    // Torso基準のright/upで少しだけ世界座標オフセット
    const torso = findTorsoRef(mesh, chain.shoulder || chain.arm)
    const basis = getWorldBasis(torso || mesh)
    const sideSign = side === 'R' ? +1 : -1
    const offsetWorld = new THREE.Vector3()
      .add(basis.right.clone().multiplyScalar(0.08 * sideSign))
      .add(basis.up.clone().multiplyScalar(0.02))
    const initWorld = armWorldForRoot.clone().add(offsetWorld)
    shoulderTracker.position.copy(initWorld.applyMatrix4(invMeshMat))
    shoulderTracker.quaternion.identity()
    shoulderTracker.updateMatrixWorld(true)

    // Elbow tracker (child of shoulder)
    const elbowTracker = new THREE.Object3D()
    elbowTracker.name = `${side === 'L' ? '左' : '右'}肘_IK_TRACKER`
    shoulderTracker.add(elbowTracker)
    const elbowWorld = (chain.elbow || wrist).getWorldPosition(new THREE.Vector3())
    elbowTracker.position.copy(elbowWorld.clone().applyMatrix4(new THREE.Matrix4().copy(shoulderTracker.matrixWorld).invert()))
    elbowTracker.quaternion.identity()
    elbowTracker.updateMatrixWorld(true)


    // Hand tracker (child of elbow)
    const armTracker = new THREE.Object3D()
    armTracker.name = `${side === 'L' ? '左' : '右'}手首_IK_TRACKER`
    elbowTracker.add(armTracker)
    const wristWorld = wrist.getWorldPosition(new THREE.Vector3())
    armTracker.position.copy(wristWorld.clone().applyMatrix4(new THREE.Matrix4().copy(elbowTracker.matrixWorld).invert()))
    armTracker.quaternion.identity()
    armTracker.updateMatrixWorld(true)

    // Hand tracker (child of wrist)
    const handTracker = new THREE.Object3D()
    handTracker.name = `${side === 'L' ? '左' : '右'}手_IK_TRACKER`
    armTracker.add(handTracker)
    const parentInvQuat = armTracker.getWorldQuaternion(new THREE.Quaternion()).invert()
    const wristWorldQuat = wrist.getWorldQuaternion(new THREE.Quaternion())
    handTracker.quaternion.copy(parentInvQuat.multiply(wristWorldQuat))
    handTracker.position.copy(tipWorld.clone().applyMatrix4(new THREE.Matrix4().copy(armTracker.matrixWorld).invert()))
    handTracker.updateMatrixWorld(true)

    // Visual link lines for parent-child tracker relations in arm
    const mkLink = (parentObj, childObj, color = 0xffaa00) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), childObj.position.clone()
      ])
      const line = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false })
      )
      line.renderOrder = 998
      parentObj.add(line)
      return line
    }
    const shoulderElbowLine = mkLink(shoulderTracker, elbowTracker, 0xff8800)
    const elbowArmLine = mkLink(elbowTracker, armTracker, 0xff8800)
    const armHandLine = mkLink(armTracker, handTracker, 0xff8800)
    // effector: prefer middle1 if found, else wrist (最終到達点)
    const effector = middle1 || wrist
    const torsoRef = findTorsoRef(mesh, chain.shoulder || chain.arm)
    const upperLen = lengthBetween(chain.arm, chain.elbow)
    const lowerLen = lengthBetween(chain.elbow, wrist)
    // For backward compatibility, set tracker=armTracker
    return { side, wrist, effector, tracker: armTracker, armTracker, handTracker, elbowTracker, shoulderTracker, shoulderElbowLine, elbowArmLine, armHandLine, torsoRef, upperLen, lowerLen, finger1: middle1, ...chain }
  }

  const left = createFor('L'); if (left) trackers.push(left)
  const right = createFor('R'); if (right) trackers.push(right)
  armIkTrackersByMesh.set(mesh, trackers)
  return trackers
}

// Solve arm IK for IKトラッカー chains (shoulder->arm->elbow->wrist)
function solveArmIKTrackersLegacy(mesh, iterations = 48, maxStep = 0.25) {
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

// Improved VRChat-like arm IK solver with elbow pole and shoulder stabilization
export function solveArmIKTrackers(mesh, iterations = 36, maxStep = 0.22, force = false) {
  const trackers = armIkTrackersByMesh.get(mesh)
  if (!Array.isArray(trackers) || trackers.length === 0) return
  for (const t of trackers) {
    const { shoulder, arm, elbow, wrist, effector, armTracker, handTracker, elbowTracker, shoulderTracker, tracker: compatTracker } = t
    const eff = effector || wrist
    const targetObj = armTracker || compatTracker
    if (!arm || !elbow || !wrist || !targetObj) continue
    const elbowStep = maxStep
    const armStep = maxStep * 0.75
    const shoulderStep = maxStep * 0.5
    const selObj = (typeof selectedIK !== 'undefined' && selectedIK?.value?.target) || null

    // どのトラッカーが操作されたか検出（ローカル変化 or 選択中）
    const moved = obj => {
      if (!obj) return false
      // use local position/quaternion to avoid false positives when parent moves
      const lp = obj.userData._lastLPos || (obj.userData._lastLPos = obj.position.clone())
      const lq = obj.userData._lastLQuat || (obj.userData._lastLQuat = obj.quaternion.clone())
      const posChanged = obj.position.distanceToSquared(lp) > 1e-10
      const dot = Math.abs(lq.dot(obj.quaternion))
      const rotChanged = (1 - dot) > 1e-6
      if (posChanged) lp.copy(obj.position)
      if (rotChanged) lq.copy(obj.quaternion)
      return posChanged || rotChanged || selObj === obj
    }
    const forceArm = force && selObj !== handTracker
    const movedArmTracker = forceArm || moved(armTracker)
    const movedElbowTracker = forceArm || moved(elbowTracker)
    const movedShoulderTracker = forceArm || moved(shoulderTracker)
    const movedHandTracker = force || moved(handTracker)

    // Phase 1: 腕IK（脚と同様の分担）
    //  - 腕IKトラッカー(手)で肘だけを回して手首位置を合わせる（CCD）
    for (let i = 0; i < iterations; i++) {
      if (armTracker && movedArmTracker) {
        // 肘のみで手首位置を腕トラッカーに近づける
        ccdStep(mesh, elbow, wrist, armTracker, elbowStep)
      }
      if (elbowTracker && movedElbowTracker) {
        // 上腕のみで肘位置を「腕IKトラッカー(=肘位置トラッカー)」へ近づける
        ccdStep(mesh, arm, elbow, elbowTracker, armStep)
      }
      if (shoulder && shoulderTracker && movedShoulderTracker) {
        // 肩のみで肘位置を「肩IKトラッカー」方向へ近づける
        // 目標は「上腕起点からトラッカー方向に上腕長だけ伸ばした仮想肘位置」に設定
        try {
          const A = arm.getWorldPosition(new THREE.Vector3())
          const E = elbow.getWorldPosition(new THREE.Vector3())
          const ST = shoulderTracker.getWorldPosition(new THREE.Vector3())
          const dir = ST.clone().sub(A)
          if (dir.lengthSq() > 1e-10) {
            dir.normalize()
            const len = E.distanceTo(A)
            const desiredElbow = A.clone().add(dir.multiplyScalar(len))
            const tmpTarget = t._shoulderElbowTarget || (t._shoulderElbowTarget = new THREE.Object3D())
            tmpTarget.position.copy(desiredElbow)
            ccdStep(mesh, shoulder, elbow, tmpTarget, shoulderStep)
          }
        } catch {}
      }

      // Multi-target convergence check（このフレームで操作されたターゲットのみ判定）
      let okW = true, okE = true, okS = true
      if (movedArmTracker && armTracker) {
        const dW = wrist.getWorldPosition(_v1).distanceTo(armTracker.getWorldPosition(_v2))
        okW = dW < 1e-3
      }
      if (movedElbowTracker && elbowTracker) {
        const ePos = elbow.getWorldPosition(new THREE.Vector3())
        const eTar = elbowTracker.getWorldPosition(new THREE.Vector3())
        okE = ePos.distanceTo(eTar) < 1e-3
      }
      if (movedShoulderTracker && shoulder && shoulderTracker) {
        const A = arm.getWorldPosition(new THREE.Vector3())
        const E = elbow.getWorldPosition(new THREE.Vector3())
        const ST = shoulderTracker.getWorldPosition(new THREE.Vector3())
        const dir = ST.clone().sub(A).normalize()
        const desiredElbow = A.clone().add(dir.multiplyScalar(E.distanceTo(A)))
        okS = E.distanceTo(desiredElbow) < 1e-3
      }
      if (i > 10 && okW && okE && okS) break
    }

    // Shoulder/elbow tracker movement can rotate the shoulder/arm, which misaligns the child bones.
    // Re-solve CCD to align them with their respective trackers.
    if (movedShoulderTracker || movedElbowTracker) {
      const elbowQuatKeep = elbow.quaternion.clone()

      // Align elbow bone to elbow tracker (driven by arm rotation)
      if (movedShoulderTracker) {
        for (let i = 0; i < 8; i++) {
          ccdStep(mesh, arm, elbow, elbowTracker, armStep * 0.5)
          if (elbow.getWorldPosition(_v1).distanceTo(elbowTracker.getWorldPosition(_v2)) < 1e-3) break
        }
        // Preserve elbow rotation, only arm rotation is used for alignment
        elbow.quaternion.copy(elbowQuatKeep)
        elbow.updateMatrixWorld(true)
        try { clampBoneToLimits(arm, getBoneLimits(mesh, arm)) } catch {}
      }

      // Align wrist bone to arm tracker (hand tracker) (driven by elbow rotation)
      for (let i = 0; i < 8; i++) {
        ccdStep(mesh, elbow, wrist, armTracker, elbowStep * 0.5)
        if (wrist.getWorldPosition(_v1).distanceTo(armTracker.getWorldPosition(_v2)) < 1e-3) break
      }
      try { clampBoneToLimits(elbow, getBoneLimits(mesh, elbow)) } catch {}

      // Align hand-tip bone to hand-tip tracker (driven by elbow rotation)
      if (handTracker && eff) {
        for (let i = 0; i < 8; i++) {
          ccdStep(mesh, elbow, eff, handTracker, elbowStep * 0.5)
          if (eff.getWorldPosition(_v1).distanceTo(handTracker.getWorldPosition(_v2)) < 1e-3) break
        }
        try { clampBoneToLimits(elbow, getBoneLimits(mesh, elbow)) } catch {}
      }
    }


    // 肘ポール制約（上腕軸回りのねじれ方向を安定化）
    try {
      // elbow pole (deprecated) removed
    } catch {}

    // (elbow pole removed)
    try {
      // Update parent-child link lines for arm trackers
      if (t.shoulderElbowLine && t.elbowTracker) {
        const geom = t.shoulderElbowLine.geometry
        const arr = geom.getAttribute('position')
        if (arr && arr.count >= 2) {
          arr.setXYZ(0, 0, 0, 0)
          arr.setXYZ(1, t.elbowTracker.position.x, t.elbowTracker.position.y, t.elbowTracker.position.z)
          arr.needsUpdate = true
          geom.computeBoundingSphere?.()
        }
      }
      if (t.elbowArmLine && t.armTracker) {
        const geom = t.elbowArmLine.geometry
        const arr = geom.getAttribute('position')
        if (arr && arr.count >= 2) {
          arr.setXYZ(0, 0, 0, 0)
          arr.setXYZ(1, t.armTracker.position.x, t.armTracker.position.y, t.armTracker.position.z)
          arr.needsUpdate = true
          geom.computeBoundingSphere?.()
        }
      }
      if (t.armHandLine && t.handTracker) {
        const geom = t.armHandLine.geometry
        const arr = geom.getAttribute('position')
        if (arr && arr.count >= 2) {
          arr.setXYZ(0, 0, 0, 0)
          arr.setXYZ(1, t.handTracker.position.x, t.handTracker.position.y, t.handTracker.position.z)
          arr.needsUpdate = true
          geom.computeBoundingSphere?.()
        }
      }
    } catch {}

    // Clamp joints to model-provided limits（正確なクランプのみ適用）
    try {
      clampBoneToLimits(elbow, getBoneLimits(mesh, elbow))
      clampBoneToLimits(arm, getBoneLimits(mesh, arm))
      if (shoulder) clampBoneToLimits(shoulder, getBoneLimits(mesh, shoulder))
    } catch {}

    // Phase 2: 手IK（handTracker の位置から手首回転を導出）
    if (handTracker) {
      const parent = wrist.parent
      const parentWorldInv = parent ? parent.getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion().identity()
      const targetLocal = parentWorldInv.multiply(handTracker.getWorldQuaternion(new THREE.Quaternion()))
      wrist.quaternion.slerp(targetLocal, 0.6)
      wrist.updateMatrixWorld(true)
      if (movedHandTracker) {
        if (armTracker && selObj !== handTracker && !isDraggingIk.value) {
          const p = armTracker.parent
          wrist.getWorldPosition(_v1)
          p?.worldToLocal(_v1)
          armTracker.position.copy(_v1)
          armTracker.updateMatrixWorld(true)
        }
        // 操作中はトラッカー位置をボーンに引き戻さない
        if (selObj !== handTracker && !isDraggingIk.value) {
          const effWorld = eff.getWorldPosition(_v1)
          const htWorld = handTracker.getWorldPosition(_v2)
          if (effWorld.distanceToSquared(htWorld) > 1e-4) {
            const parentHT = handTracker.parent
            parentHT?.worldToLocal(effWorld)
            handTracker.position.copy(effWorld)
            const parentInvQuat = parentHT?.getWorldQuaternion(new THREE.Quaternion()).invert()
            const worldQuat = eff.getWorldQuaternion(new THREE.Quaternion())
            if (parentInvQuat) handTracker.quaternion.copy(parentInvQuat.multiply(worldQuat))
            handTracker.updateMatrixWorld(true)
          }
        }
      }
    }

    // Shoulder return-to-rest bias（肩IKトラッカー存在時は無効）
    if (!shoulderTracker) {
      try {
        if (shoulder && shoulder.userData?._origQuat) {
          const effDist = wrist.getWorldPosition(_v1).distanceTo((shoulder || arm).getWorldPosition(_v2))
          const reach = (t.upperLen || lengthBetween(arm, elbow)) + (t.lowerLen || lengthBetween(elbow, wrist))
          const slack = THREE.MathUtils.clamp(1 - (effDist / Math.max(reach, 1e-3)), 0, 1)
          const relax = 0.08 * (0.5 + 0.5 * slack)
          if (relax > 0) shoulder.quaternion.slerp(shoulder.userData._origQuat, relax)
        }
      } catch {}
    }
  }
  try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
}

// --- Reconstructed tail (lost earlier due to edits) ---
// duplicate helpers (already declared earlier)
// const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3()
// const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion()

function toArray3__old(v) {
  if (!v) return null
  if (Array.isArray(v)) return v
  if (typeof v === 'object' && v !== null && 'x' in v && 'y' in v && 'z' in v) return [v.x, v.y, v.z]
  return null
}
function degToRadIfNeeded__old(arr) {
  if (!arr) return null
  const absMax = Math.max(...arr.map(a => Math.abs(a ?? 0)))
  if (absMax > Math.PI * 1.05) return arr.map(a => (a ?? 0) * Math.PI / 180)
  return arr
}
function getBoneLimits__old(mesh, bone) {
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
  if (/(上腕|upperarm|arm)/.test(n)) return { min: [-1.0, -1.0, -1.0], max: [1.0, 1.0, 1.0] }
  if (/(肩|shoulder|clavicle)/.test(n)) return { min: [-0.7, -0.7, -0.7], max: [0.7, 0.7, 0.7] }
  if (/(足|ankle|foot)/.test(n)) return { min: [-1.0, -0.6, -0.6], max: [1.0, 0.6, 0.6] }
  return { min: [-Math.PI, -Math.PI, -Math.PI], max: [Math.PI, Math.PI, Math.PI] }
}
function clampBoneToLimits__old(bone, limits) {
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
function ccdStep__old(mesh, bone, effector, targetObj, maxStep) {
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

// New leg tracker structure and solver
export function ensureLegTrackers(scene, mesh) {
  if (!mesh || !mesh.skeleton) return
  const bones = mesh.skeleton.bones
  const prev = legIkTrackersByMesh.get(mesh) || []
  prev.forEach(t => { try {
    t.legTracker?.parent?.remove(t.legTracker);
    t.footTracker?.parent?.remove(t.footTracker);
    t.kneeTracker?.parent?.remove(t.kneeTracker);
    t.kneePole?.parent?.remove(t.kneePole);
    if (t.kneePoleLine) {
      t.kneePoleLine.parent?.remove(t.kneePoleLine)
      try { t.kneePoleLine.geometry?.dispose(); t.kneePoleLine.material?.dispose() } catch {}
    }
    if (t.kneeLegLine) { t.kneeLegLine.parent?.remove(t.kneeLegLine); try { t.kneeLegLine.geometry?.dispose(); t.kneeLegLine.material?.dispose() } catch {} }
    if (t.legFootLine) { t.legFootLine.parent?.remove(t.legFootLine); try { t.legFootLine.geometry?.dispose(); t.legFootLine.material?.dispose() } catch {} }
  } catch {} })
  const trackers = []
  const findBone = (name) => findBoneByName(bones, name)
  function createFor(side) {
    const ankle = findBone(side === 'L' ? '左足首' : '右足首') || findBone(side === 'L' ? '左足' : '右足')
    if (!ankle) return null
    const knee = ankle.parent && ankle.parent.isBone ? ankle.parent : null
    const upper = knee && knee.parent && knee.parent.isBone ? knee.parent : null
    if (!knee || !upper) return null
    const toe = ankle.children.find(c => c && c.isBone) || null
    // 親IKトラッカーは作らず、膝＞足＞足先の親子関係で配置
    // Knee tracker (root of leg trackers)
    const kneeTracker = new THREE.Object3D(); kneeTracker.name = `${side === 'L' ? '左' : '右'}膝_IK_TRACKER`; mesh.add(kneeTracker)
    const invMeshMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
    kneeTracker.position.copy(knee.getWorldPosition(new THREE.Vector3()).applyMatrix4(invMeshMat))
    kneeTracker.quaternion.identity()
    kneeTracker.updateMatrixWorld(true)
    const torso = findTorsoRef(mesh, upper)
    // Ankle tracker (child of knee)
    const legTracker = new THREE.Object3D(); legTracker.name = `${side === 'L' ? '左' : '右'}足首_IK_TRACKER`; kneeTracker.add(legTracker)
    legTracker.position.copy(ankle.getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(kneeTracker.matrixWorld).invert()))
    legTracker.quaternion.identity()
    legTracker.updateMatrixWorld(true)
    // Toe tracker (child of ankle)
    const footTracker = new THREE.Object3D(); footTracker.name = `${side === 'L' ? '左' : '右'}つま先_IK_TRACKER`; legTracker.add(footTracker)
    const ankleWorldQuat = ankle.getWorldQuaternion(new THREE.Quaternion())
    const parentInvQuat = legTracker.getWorldQuaternion(new THREE.Quaternion()).invert()
    footTracker.quaternion.copy(parentInvQuat.multiply(ankleWorldQuat))
    const toeWorldPos = (toe ? toe.getWorldPosition(new THREE.Vector3()) : ankle.getWorldPosition(new THREE.Vector3()))
    footTracker.position.copy(toeWorldPos.applyMatrix4(new THREE.Matrix4().copy(legTracker.matrixWorld).invert()))
    footTracker.updateMatrixWorld(true)

    // Visual link lines for parent-child tracker relations in leg
    const mkLink = (parentObj, childObj, color = 0x00ff88) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), childObj.position.clone()
      ])
      const line = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false })
      )
      line.renderOrder = 998
      parentObj.add(line)
      return line
    }
    const kneeLegLine = mkLink(kneeTracker, legTracker, 0x00cc88)
    const legFootLine = mkLink(legTracker, footTracker, 0x00cc88)
    // torso already defined above
    // Return trackers
    return { side, upper, knee, ankle, toe, legTracker, kneeTracker, kneeLegLine, legFootLine, footTracker, torsoRef: torso }
  }
  const left = createFor('L'); if (left) trackers.push(left)
  const right = createFor('R'); if (right) trackers.push(right)
  legIkTrackersByMesh.set(mesh, trackers)
  return trackers
}

export function solveLegIKTrackers(mesh, iterations = 36, maxStep = 0.22, force = false) {
  const trackers = legIkTrackersByMesh.get(mesh)
  if (!Array.isArray(trackers) || trackers.length === 0) return
  for (const t of trackers) {
    const { upper, knee, ankle, toe, legTracker, kneeTracker, kneeLegLine, legFootLine, footTracker, torsoRef } = t
    if (!upper || !knee || !ankle || !legTracker) continue
    const selObj = (typeof selectedIK !== 'undefined' && selectedIK?.value?.target) || null
    const moved = obj => {
      if (!obj) return false
      const lp = obj.userData._lastLPos || (obj.userData._lastLPos = obj.position.clone())
      const lq = obj.userData._lastLQuat || (obj.userData._lastLQuat = obj.quaternion.clone())
      const posChanged = obj.position.distanceToSquared(lp) > 1e-10
      const dot = Math.abs(lq.dot(obj.quaternion))
      const rotChanged = (1 - dot) > 1e-6
      if (posChanged) lp.copy(obj.position)
      if (rotChanged) lq.copy(obj.quaternion)
      return posChanged || rotChanged || selObj === obj
    }
    const forceLeg = force && selObj !== footTracker
    const movedLeg = forceLeg || moved(legTracker)
    const movedKnee = forceLeg || moved(kneeTracker)
    const movedFootTracker = force || moved(footTracker)
    // 足首トラッカーの移動でも足先トラッカーはワールド座標が変化するため、
    // legTracker の移動を足先トラッカーの移動として扱う
    const movedFoot = movedFootTracker || movedLeg

    const kneeStep = maxStep
    const upperStep = maxStep
    // Phase 1: 脚IK（膝と大腿の回転のみで、足首の位置を legTracker に合わせる。足首の回転は固定）
    const ankleQuatKeep = ankle.quaternion.clone()
    for (let i = 0; i < iterations; i++) {
      // 両足は膝の回転（足トラッカーで膝のみを回す）
      if (movedLeg) ccdStep(mesh, knee, ankle, legTracker, kneeStep)
      // no knee pole correction (no pole mode)
      const dist = ankle.getWorldPosition(_v1).distanceTo(legTracker.getWorldPosition(_v2))
      if (i > 10 && dist < 1e-3) break
    }
    // 足首の回転は固定（Phase1では変更しない）
    ankle.quaternion.copy(ankleQuatKeep)
    ankle.updateMatrixWorld(true)
    // ヒンジ固定は行わない（モデルの可動域/ローカル軸に任せる）
    try { clampBoneToLimits(knee, getBoneLimits(mesh, knee)); clampBoneToLimits(upper, getBoneLimits(mesh, upper)) } catch {}

    // (knee pole removed)

    // Knee-tracker drives hip (upper leg) rotation: 両膝は股関節（足）の回転
    if (kneeTracker && movedKnee) {
      const U = upper.getWorldPosition(new THREE.Vector3())
      const K = knee.getWorldPosition(new THREE.Vector3())
      const KT = kneeTracker.getWorldPosition(new THREE.Vector3())
      const vCur = K.clone().sub(U)
      const vTar = KT.clone().sub(U)
      if (vCur.lengthSq() > 1e-10 && vTar.lengthSq() > 1e-10) {
        const vC = vCur.clone().normalize()
        const vT = vTar.clone().normalize()
        const dot = THREE.MathUtils.clamp(vC.dot(vT), -1, 1)
        let ang = Math.acos(dot)
        if (ang > 1e-6) {
          const axis = new THREE.Vector3().crossVectors(vC, vT)
          if (axis.lengthSq() > 1e-12) {
            axis.normalize()
            // limit per-iteration rotation for stability
            const step = Math.min(ang, upperStep)
            rotateBoneAroundWorldAxis(upper, axis, step)
            upper.updateMatrixWorld(true)
          }
        }
      }
      try { clampBoneToLimits(upper, getBoneLimits(mesh, upper)) } catch {}
    }

    // Knee-tracker movement can rotate the hip, which misaligns the ankle and toe bones.
    // Re-solve CCD for the knee to align the bones with their respective trackers.
    if (movedKnee) {
      // 1. Align ankle bone to leg tracker
      for (let i = 0; i < 8; i++) {
        ccdStep(mesh, knee, ankle, legTracker, kneeStep * 0.5)
        if (ankle.getWorldPosition(_v1).distanceTo(legTracker.getWorldPosition(_v2)) < 1e-3) break
      }

      // 2. Align toe bone to foot tracker
      if (toe && footTracker) {
        for (let i = 0; i < 8; i++) {
          ccdStep(mesh, knee, toe, footTracker, kneeStep * 0.5)
          if (toe.getWorldPosition(_v1).distanceTo(footTracker.getWorldPosition(_v2)) < 1e-3) break
        }
      }

      try { clampBoneToLimits(knee, getBoneLimits(mesh, knee)) } catch {}

      // リーチ外に出た子トラッカーはボーン位置へ戻す（操作中は除外）
      if (legTracker && selObj !== legTracker && !isDraggingIk.value) {
        const parent = legTracker.parent
        ankle.getWorldPosition(_v1)
        parent?.worldToLocal(_v1)
        legTracker.position.copy(_v1)
        legTracker.updateMatrixWorld(true)
      }
      if (footTracker && selObj !== footTracker && !isDraggingIk.value) {
        const eff = toe || ankle
        const parent = footTracker.parent
        eff.getWorldPosition(_v1)
        parent?.worldToLocal(_v1)
        footTracker.position.copy(_v1)
        const parentInvQuat = parent?.getWorldQuaternion(new THREE.Quaternion()).invert()
        const worldQuat = eff.getWorldQuaternion(new THREE.Quaternion())
        if (parentInvQuat) footTracker.quaternion.copy(parentInvQuat.multiply(worldQuat))
        footTracker.updateMatrixWorld(true)
      }
    }

    if (movedLeg && footTracker && selObj !== footTracker && !isDraggingIk.value) {
      // 足首トラッカー移動時も足先トラッカーをつま先ボーン位置に追従させる
      const eff = toe || ankle
      const parent = footTracker.parent
      eff.getWorldPosition(_v1)
      parent?.worldToLocal(_v1)
      footTracker.position.copy(_v1)
      const parentInvQuat = parent?.getWorldQuaternion(new THREE.Quaternion()).invert()
      const worldQuat = eff.getWorldQuaternion(new THREE.Quaternion())
      if (parentInvQuat) footTracker.quaternion.copy(parentInvQuat.multiply(worldQuat))
      footTracker.updateMatrixWorld(true)
    }

    if (footTracker && movedFoot) {
      // 足IKトラッカーを動かした場合、つま先がトラッカー位置に来るように足首のみを調整
      const eff = toe || ankle
      for (let i = 0; i < iterations; i++) {
        ccdStep(mesh, ankle, eff, footTracker, kneeStep)
        const effDist = eff.getWorldPosition(_v1).distanceTo(footTracker.getWorldPosition(_v2))
        if (effDist < 1e-3) break
      }
      // 足首IKトラッカーは常に足首ボーン位置に維持
      if (!movedLeg && legTracker && selObj !== footTracker && !isDraggingIk.value) {
        const parent = legTracker.parent
        ankle.getWorldPosition(_v1)
        parent?.worldToLocal(_v1)
        legTracker.position.copy(_v1)
        legTracker.updateMatrixWorld(true)
      }
      // 到達不能な位置に移動した場合はつま先トラッカーをボーン位置へ戻す（操作中は除外）
      if (selObj !== footTracker && !isDraggingIk.value) {
        const effWorld = eff.getWorldPosition(_v1)
        const trackerWorld = footTracker.getWorldPosition(_v2)
        if (effWorld.distanceToSquared(trackerWorld) > 1e-4) {
          const parent = footTracker.parent
          parent?.worldToLocal(effWorld)
          footTracker.position.copy(effWorld)
          const parentInvQuat = parent?.getWorldQuaternion(new THREE.Quaternion()).invert()
          const worldQuat = eff.getWorldQuaternion(new THREE.Quaternion())
          if (parentInvQuat) footTracker.quaternion.copy(parentInvQuat.multiply(worldQuat))
          footTracker.updateMatrixWorld(true)
        }
      }
    }

    if (footTracker && (movedFoot || movedKnee)) {
      // Phase 2: 足IK（足先トラッカー方向に足首の回転のみ合わせる）
      const parent = ankle.parent
      const A = ankle.getWorldPosition(new THREE.Vector3())
      const T = toe ? toe.getWorldPosition(new THREE.Vector3()) : A.clone().add(new THREE.Vector3(0, -1, 0).applyQuaternion(ankle.getWorldQuaternion(new THREE.Quaternion())))
      const F = footTracker.getWorldPosition(new THREE.Vector3())
      const vToToe = T.clone().sub(A).normalize()
      const vToTarget = F.clone().sub(A).normalize()
      if (vToToe.lengthSq() > 1e-10 && vToTarget.lengthSq() > 1e-10) {
        const deltaWorld = new THREE.Quaternion().setFromUnitVectors(vToToe, vToTarget)
        const ankleWorldQuat = ankle.getWorldQuaternion(new THREE.Quaternion())
        const desiredWorldQuat = deltaWorld.multiply(ankleWorldQuat)
        const parentWorldInv = parent ? parent.getWorldQuaternion(new THREE.Quaternion()).invert() : new THREE.Quaternion().identity()
        const desiredLocal = parentWorldInv.multiply(desiredWorldQuat)
        ankle.quaternion.slerp(desiredLocal, 0.6)
        ankle.updateMatrixWorld(true)
      }
      // 位置補正は行わない（ボーン長維持のため）。回転クランプのみ適用
      try { clampBoneToLimits(ankle, getBoneLimits(mesh, ankle)) } catch {}
    }
    // Update leg link lines
    try {
      if (kneeLegLine && legTracker) {
        const g = kneeLegLine.geometry
        const a = g.getAttribute('position')
        if (a && a.count >= 2) { a.setXYZ(0,0,0,0); a.setXYZ(1, legTracker.position.x, legTracker.position.y, legTracker.position.z); a.needsUpdate = true; g.computeBoundingSphere?.() }
      }
      if (legFootLine && footTracker) {
        const g = legFootLine.geometry
        const a = g.getAttribute('position')
        if (a && a.count >= 2) { a.setXYZ(0,0,0,0); a.setXYZ(1, footTracker.position.x, footTracker.position.y, footTracker.position.z); a.needsUpdate = true; g.computeBoundingSphere?.() }
      }
    } catch {}
  }
  try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
}

function ensureBodyTrackers__oldA(scene, mesh) {
  if (!mesh || !mesh.skeleton) return
  const bones = mesh.skeleton.bones
  const prev = bodyTrackersByMesh.get(mesh)
  if (prev) { try { prev.head?.parent?.remove(prev.head); prev.chest?.parent?.remove(prev.chest); prev.hip?.parent?.remove(prev.hip) } catch {} }
  const find = name => findBoneByName(bones, name)
  const headBone = find('head') || find('頭') || find('首')
  const chestBone = find('upperchest') || find('chest') || find('胸') || find('上半身')
  const hipBone = find('hips') || find('腰') || find('下半身') || bones[0]
  const mk = (name, bone) => {
    if (!bone) return null
    const o = new THREE.Object3D(); o.name = name; mesh.add(o)
    const wp = bone.getWorldPosition(new THREE.Vector3())
    const wq = bone.getWorldQuaternion(new THREE.Quaternion())
    const invMeshMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
    const invMeshQuat = mesh.getWorldQuaternion(new THREE.Quaternion()).invert()
    o.position.copy(wp.applyMatrix4(invMeshMat))
    o.quaternion.copy(invMeshQuat.multiply(wq))
    o.updateMatrixWorld(true)
    return o
  }
  const body = { head: mk('HEAD_TRACKER', headBone), chest: mk('CHEST_TRACKER', chestBone), hip: mk('HIP_TRACKER', hipBone), headBone, chestBone, hipBone }
  bodyTrackersByMesh.set(mesh, body)
  return body
}

function solveBodyTrackers__oldA(mesh, slerp = 0.5) {
  const body = bodyTrackersByMesh.get(mesh)
  if (!body) return
  const apply = (bone, target) => {
    if (!bone || !target) return
    bone.updateMatrixWorld(true); target.updateMatrixWorld(true)
    const parent = bone.parent
    const twq = target.getWorldQuaternion(new THREE.Quaternion())
    const twp = target.getWorldPosition(new THREE.Vector3())
    if (parent) {
      const pwqInv = parent.getWorldQuaternion(new THREE.Quaternion()).invert()
      const pwpInv = new THREE.Matrix4().copy(parent.matrixWorld).invert()
      const lq = pwqInv.multiply(twq)
      const lp = twp.applyMatrix4(pwpInv)
      bone.quaternion.slerp(lq, THREE.MathUtils.clamp(slerp, 0, 1))
      bone.position.lerp(lp, THREE.MathUtils.clamp(slerp, 0, 1))
    } else {
      bone.quaternion.slerp(twq, THREE.MathUtils.clamp(slerp, 0, 1))
      bone.position.lerp(twp, THREE.MathUtils.clamp(slerp, 0, 1))
    }
    bone.updateMatrixWorld(true)
  }
  apply(body.hipBone, body.hip)
  apply(body.chestBone, body.chest)
  apply(body.headBone, body.head)
  try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
}

function updateIKMarkers__oldA(camera, renderer, raycaster, skipMatrixUpdate = false) {
  if (!camera || !renderer || ikTargets.length === 0) return
  const visible = showIkMarkers.value
  if (!visible) { ikTargets.forEach(t => (t.marker.visible = false)); return }
  const height = renderer.domElement.clientHeight
  if (height <= 0) return
  if (camera !== cachedCamera || camera.fov !== cachedFov) {
    cachedCamera = camera; cachedFov = camera.fov; cachedFovRad = THREE.MathUtils.degToRad(cachedFov)
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

async function initIKSolver__oldA(helper, mesh, ensureFloorRigidBody, Ammo) {
  if (!mesh || !helper) return
  const skinnedMesh = mesh.isSkinnedMesh ? mesh : mesh.getObjectByProperty('type', 'SkinnedMesh')
  if (!skinnedMesh) { console.error('initIKSolver: SkinnedMesh not found for', mesh.name); return }
  try { devLog({ event: 'ik:init', mesh: skinnedMesh.name, ammoArg: !!Ammo, globalAmmo: !!(typeof window !== 'undefined' && window.Ammo) }) } catch {}
  // PMXのIKチェーンは使用しない
  let iks = []
  skinnedMesh.geometry.userData.MMD = skinnedMesh.geometry.userData.MMD || {}
  skinnedMesh.geometry.userData.MMD.iks = iks
  if (!helper.objects.get(skinnedMesh)) {
    const hasAmmo = !!(Ammo || (typeof window !== 'undefined' && window.Ammo))
    helper.add(skinnedMesh, { physics: hasAmmo, ik: false, grant: true })
    helper.update(0)
  }
  skinnedMesh.skeleton?.update()
  ensureFloorRigidBody()
}

watch(showIkMarkers, v => { ikTargets.forEach(t => (t.marker.visible = v)) })

function solveLegIKTrackers__oldB(mesh, iterations = 36, maxStep = 0.22) {
  const trackers = legIkTrackersByMesh.get(mesh)
  if (!Array.isArray(trackers) || trackers.length === 0) return
  for (const t of trackers) {
    const { upper, knee, ankle, tracker, torsoRef } = t
    if (!upper || !knee || !ankle || !tracker) continue
    const ankleStep = Math.max(0.08, maxStep * 0.35)
    const kneeStep = maxStep
    const upperStep = maxStep
    for (let i = 0; i < iterations; i++) {
      ccdStep(mesh, ankle, ankle, tracker, ankleStep)
      ccdStep(mesh, knee, ankle, tracker, kneeStep)
      ccdStep(mesh, upper, ankle, tracker, upperStep)
      // Knee pole correction
      try {
        const S = upper.getWorldPosition(_v1)
        const T = tracker.getWorldPosition(_v2)
        const E = knee.getWorldPosition(_v3)
        const sw = _tmpV1.subVectors(T, S)
        if (sw.lengthSq() > 1e-10) {
          sw.normalize()
          const se = _tmpV2.subVectors(E, S)
          const seProj = se.clone().sub(sw.clone().multiplyScalar(se.dot(sw)))
          const poleDir = getWorldBasis(torsoRef || upper).forward
          const basis = getWorldBasis(torsoRef || upper);
          const spProj = poleDir.clone().sub(sw.clone().multiplyScalar(poleDir.dot(sw)))
          if (seProj.lengthSq() > 1e-10 && spProj.lengthSq() > 1e-10) {
            seProj.normalize(); spProj.normalize()
            const dot = THREE.MathUtils.clamp(seProj.dot(spProj), -1, 1)
            let ang = Math.acos(dot)
            const cross = new THREE.Vector3().crossVectors(seProj, spProj)
            const sign = Math.sign(sw.dot(cross)) || 1
            ang = Math.min(ang, maxStep * 0.7)
            if (ang > 1e-3) rotateBoneAroundWorldAxis(upper, sw, ang * sign)
          }
        }
      } catch {}
      if (i > 10 && dist < 1e-3) break
    }
    try { clampBoneToLimits(knee, getBoneLimits(mesh, knee)); clampBoneToLimits(upper, getBoneLimits(mesh, upper)) } catch {}
  }
  try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
}

function ensureLegTrackers__old(scene, mesh) {
  if (!mesh || !mesh.skeleton) return
  const bones = mesh.skeleton.bones
  const prev = legIkTrackersByMesh.get(mesh) || []
  prev.forEach(t => { try { t.tracker.parent?.remove(t.tracker); t.kneeHint?.parent?.remove(t.kneeHint) } catch {} })
  const trackers = []
  const findBone = (name) => findBoneByName(bones, name)
  function createFor(side) {
    const ankle = findBone(side === 'L' ? '左足首' : '右足首') || findBone(side === 'L' ? '左足' : '右足')
    if (!ankle) return null
    const knee = ankle.parent && ankle.parent.isBone ? ankle.parent : null
    const upper = knee && knee.parent && knee.parent.isBone ? knee.parent : null
    if (!knee || !upper) return null
    // IK root aligned to ankle parent
    const ikRoot = new THREE.Object3D()
    ikRoot.name = `${side === 'L' ? '左' : '右'}足IK親`
    mesh.add(ikRoot)
    const parentBone = ankle.parent || mesh
    const parentWorldPos = parentBone.getWorldPosition(new THREE.Vector3())
    const parentWorldQuat = parentBone.getWorldQuaternion(new THREE.Quaternion())
    const invMeshMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
    const invMeshQuat = mesh.getWorldQuaternion(new THREE.Quaternion()).invert()
    ikRoot.position.copy(parentWorldPos.clone().applyMatrix4(invMeshMat))
    ikRoot.quaternion.copy(invMeshQuat.clone().multiply(parentWorldQuat))
    ikRoot.updateMatrixWorld(true)
    // Target position
    let tipWorld = null
    const toe = ankle.children.find(c => c && c.isBone)
    if (toe) tipWorld = toe.getWorldPosition(new THREE.Vector3())
    else tipWorld = ankle.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.2, 0).applyQuaternion(ankle.getWorldQuaternion(new THREE.Quaternion())))
    const tracker = new THREE.Object3D()
    tracker.name = `${side === 'L' ? '左' : '右'}足首_IK_TRACKER`
    ikRoot.add(tracker)
    tracker.position.copy(tipWorld.applyMatrix4(new THREE.Matrix4().copy(ikRoot.matrixWorld).invert()))
    tracker.updateMatrixWorld(true)
    // Knee hint
    const torso = findTorsoRef(mesh, upper)
    const basis = getWorldBasis(torso || mesh)
    return { side, upper, knee, ankle, tracker, ikRoot, torsoRef: torso }
  }
  const left = createFor('L'); if (left) trackers.push(left)
  const right = createFor('R'); if (right) trackers.push(right)
  legIkTrackersByMesh.set(mesh, trackers)
  return trackers
}

export function ensureBodyTrackers(scene, mesh) {
  if (!mesh || !mesh.skeleton) return
  const bones = mesh.skeleton.bones
  const prev = bodyTrackersByMesh.get(mesh)
  if (prev) { try { prev.head?.parent?.remove(prev.head); prev.chest?.parent?.remove(prev.chest); prev.hip?.parent?.remove(prev.hip) } catch {} }
  const find = name => findBoneByName(bones, name)
  const headBone = find('head') || find('頭') || find('首')
  const chestBone = find('upperchest') || find('chest') || find('胸') || find('上半身')
  const hipBone = find('hips') || find('腰') || find('下半身') || bones[0]
  const mk = (name, bone) => {
    if (!bone) return null
    const o = new THREE.Object3D(); o.name = name; mesh.add(o)
    const wp = bone.getWorldPosition(new THREE.Vector3())
    const wq = bone.getWorldQuaternion(new THREE.Quaternion())
    const invMeshMat = new THREE.Matrix4().copy(mesh.matrixWorld).invert()
    const invMeshQuat = mesh.getWorldQuaternion(new THREE.Quaternion()).invert()
    o.position.copy(wp.applyMatrix4(invMeshMat))
    o.quaternion.copy(invMeshQuat.multiply(wq))
    o.updateMatrixWorld(true)
    return o
  }
  const body = { head: mk('HEAD_TRACKER', headBone), chest: mk('CHEST_TRACKER', chestBone), hip: mk('HIP_TRACKER', hipBone), headBone, chestBone, hipBone }
  bodyTrackersByMesh.set(mesh, body)
  return body
}

export function solveBodyTrackers(mesh, slerp = 0.5) {
  const body = bodyTrackersByMesh.get(mesh)
  if (!body) return
  const selObj = (typeof selectedIK !== 'undefined' && selectedIK?.value?.target) || null
  const affectsThis = selObj && (selObj === body.head || selObj === body.chest || selObj === body.hip)
  if (!affectsThis) return
  const apply = (bone, target) => {
    if (!bone || !target) return
    bone.updateMatrixWorld(true); target.updateMatrixWorld(true)
    const parent = bone.parent
    const twq = target.getWorldQuaternion(new THREE.Quaternion())
    const twp = target.getWorldPosition(new THREE.Vector3())
    if (parent) {
      const pwqInv = parent.getWorldQuaternion(new THREE.Quaternion()).invert()
      const pwpInv = new THREE.Matrix4().copy(parent.matrixWorld).invert()
      const lq = pwqInv.multiply(twq)
      const lp = twp.applyMatrix4(pwpInv)
      bone.quaternion.slerp(lq, THREE.MathUtils.clamp(slerp, 0, 1))
      bone.position.lerp(lp, THREE.MathUtils.clamp(slerp, 0, 1))
    } else {
      bone.quaternion.slerp(twq, THREE.MathUtils.clamp(slerp, 0, 1))
      bone.position.lerp(twp, THREE.MathUtils.clamp(slerp, 0, 1))
    }
    bone.updateMatrixWorld(true)
  }
  apply(body.chestBone, body.chest)
  apply(body.headBone, body.head)
  try { mesh.skeleton.update(); mesh.skeleton.boneMatricesNeedUpdate = true } catch {}
}

// 関節の最新位置に各IKトラッカーを再配置する
export function resetIkTrackerPositions(mesh) {
  if (!mesh) return
  const selObj = (typeof selectedIK !== 'undefined' && selectedIK?.value?.target) || null
  const tmpV = new THREE.Vector3()
  const updateLine = (line, child) => {
    const g = line?.geometry
    const a = g?.getAttribute('position')
    if (a && a.count >= 2 && child) {
      a.setXYZ(0, 0, 0, 0)
      a.setXYZ(1, child.position.x, child.position.y, child.position.z)
      a.needsUpdate = true
      g.computeBoundingSphere?.()
    }
  }
  const armTrackers = armIkTrackersByMesh.get(mesh) || []
  for (const t of armTrackers) {
    // ドラッグ中の腕IKチェーンはリセットしない
    if (selObj && (selObj === t.handTracker || selObj === t.armTracker || selObj === t.elbowTracker || selObj === t.shoulderTracker)) {
      continue
    }
    if (t.shoulderTracker && (t.arm || t.shoulder)) {
      const src = t.arm || t.shoulder
      src.getWorldPosition(tmpV)
      mesh.worldToLocal(tmpV)
      t.shoulderTracker.position.copy(tmpV)
      t.shoulderTracker.updateMatrixWorld(true)
    }
    if (t.elbowTracker && t.elbow) {
      const parent = t.elbowTracker.parent
      t.elbow.getWorldPosition(tmpV)
      parent?.worldToLocal(tmpV)
      t.elbowTracker.position.copy(tmpV)
      t.elbowTracker.updateMatrixWorld(true)
      updateLine(t.shoulderElbowLine, t.elbowTracker)
    }
    if (t.armTracker && t.wrist) {
      const parent = t.armTracker.parent
      t.wrist.getWorldPosition(tmpV)
      parent?.worldToLocal(tmpV)
      t.armTracker.position.copy(tmpV)
      t.armTracker.updateMatrixWorld(true)
      updateLine(t.elbowArmLine, t.armTracker)
    }
    if (t.handTracker && (t.effector || t.wrist)) {
      const parent = t.handTracker.parent
      const src = t.effector || t.wrist
      src.getWorldPosition(tmpV)
      parent?.worldToLocal(tmpV)
      t.handTracker.position.copy(tmpV)
      const parentInvQuat = parent?.getWorldQuaternion(new THREE.Quaternion()).invert()
      const worldQuat = src.getWorldQuaternion(new THREE.Quaternion())
      if (parentInvQuat) t.handTracker.quaternion.copy(parentInvQuat.multiply(worldQuat))
      t.handTracker.updateMatrixWorld(true)
      updateLine(t.armHandLine, t.handTracker)
    }
  }
  const legTrackers = legIkTrackersByMesh.get(mesh) || []
  for (const t of legTrackers) {
    // ドラッグ中の脚IKチェーンはリセットしない
    if (selObj && (selObj === t.footTracker || selObj === t.legTracker || selObj === t.kneeTracker)) {
      continue
    }
    if (t.kneeTracker && t.knee) {
      t.knee.getWorldPosition(tmpV)
      mesh.worldToLocal(tmpV)
      t.kneeTracker.position.copy(tmpV)
      t.kneeTracker.updateMatrixWorld(true)
    }
    if (t.legTracker && t.ankle) {
      const parent = t.legTracker.parent
      t.ankle.getWorldPosition(tmpV)
      parent?.worldToLocal(tmpV)
      t.legTracker.position.copy(tmpV)
      t.legTracker.updateMatrixWorld(true)
      updateLine(t.kneeLegLine, t.legTracker)
    }
    if (t.footTracker && (t.toe || t.ankle)) {
      const parent = t.footTracker.parent
      const src = t.toe || t.ankle
      src.getWorldPosition(tmpV)
      parent?.worldToLocal(tmpV)
      t.footTracker.position.copy(tmpV)
      const parentInvQuat = parent?.getWorldQuaternion(new THREE.Quaternion()).invert()
      const worldQuat = src.getWorldQuaternion(new THREE.Quaternion())
      if (parentInvQuat) t.footTracker.quaternion.copy(parentInvQuat.multiply(worldQuat))
      t.footTracker.updateMatrixWorld(true)
      updateLine(t.legFootLine, t.footTracker)
    }
  }
  const body = bodyTrackersByMesh.get(mesh)
  if (body) {
    const meshInvQuat = mesh.getWorldQuaternion(new THREE.Quaternion()).invert()
    if (body.head && body.headBone) {
      body.headBone.getWorldPosition(tmpV)
      mesh.worldToLocal(tmpV)
      body.head.position.copy(tmpV)
      const wq = body.headBone.getWorldQuaternion(new THREE.Quaternion())
      body.head.quaternion.copy(meshInvQuat.clone().multiply(wq))
      body.head.updateMatrixWorld(true)
    }
    if (body.chest && body.chestBone) {
      body.chestBone.getWorldPosition(tmpV)
      mesh.worldToLocal(tmpV)
      body.chest.position.copy(tmpV)
      const wq = body.chestBone.getWorldQuaternion(new THREE.Quaternion())
      body.chest.quaternion.copy(meshInvQuat.clone().multiply(wq))
      body.chest.updateMatrixWorld(true)
    }
    if (body.hip && body.hipBone) {
      body.hipBone.getWorldPosition(tmpV)
      mesh.worldToLocal(tmpV)
      body.hip.position.copy(tmpV)
      const wq = body.hipBone.getWorldQuaternion(new THREE.Quaternion())
      body.hip.quaternion.copy(meshInvQuat.clone().multiply(wq))
      body.hip.updateMatrixWorld(true)
    }
  }
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
function getBoneLimitsFromIK(mesh, bone) {
  try {
    const geom = mesh.geometry
    const udMMD = geom?.userData?.MMD || {}
    const iks = udMMD.__origIks || udMMD.iks || []
    const bones = mesh.skeleton?.bones || []
    const idx = bones.indexOf(bone)
    if (idx < 0) return null
    let min = null, max = null
    for (const ik of iks) {
      const links = ik?.links || []
      for (const link of links) {
        if ((link?.index ?? -1) !== idx) continue
        // Collect any shape of min/max
        const candMin = degToRadIfNeeded(
          toArray3(link?.rotationMin) || toArray3(link?.rotMin) || toArray3(link?.angleMin) || toArray3(link?.limitMin) || toArray3(link?.lower) || toArray3(link?.min)
        )
        const candMax = degToRadIfNeeded(
          toArray3(link?.rotationMax) || toArray3(link?.rotMax) || toArray3(link?.angleMax) || toArray3(link?.limitMax) || toArray3(link?.upper) || toArray3(link?.max)
        )
        if (candMin && candMax) {
          if (!min) { min = candMin.slice() } else { min = [Math.max(min[0], candMin[0]), Math.max(min[1], candMin[1]), Math.max(min[2], candMin[2])] }
          if (!max) { max = candMax.slice() } else { max = [Math.min(max[0], candMax[0]), Math.min(max[1], candMax[1]), Math.min(max[2], candMax[2])] }
        }
      }
    }
    if (min && max) return { min, max }
  } catch {}
  return null
}

function getBoneLimits(mesh, bone) {
  try {
    // 1) 優先: PMXのIKリンクにある角度制限（最も正確）
    const fromIK = getBoneLimitsFromIK(mesh, bone)
    if (fromIK) return fromIK
    // 2) 次点: ボーンデータに直接ある回転Min/Max（あれば）
    const bonesData = mesh.geometry?.userData?.MMD?.bones || []
    const idx = mesh.skeleton?.bones?.indexOf(bone)
    const data = idx >= 0 ? bonesData[idx] : null
    const min = degToRadIfNeeded(toArray3(data?.rotationMin) || toArray3(data?.rotMin) || toArray3(data?.angleMin) || toArray3(data?.limitMin))
    const max = degToRadIfNeeded(toArray3(data?.rotationMax) || toArray3(data?.rotMax) || toArray3(data?.angleMax) || toArray3(data?.limitMax))
    if (min && max) return { min, max }
  } catch {}
  // 3) フォールバックは適用しない（正確なクランプのみ適用）
  return null
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
  // PMXのIKチェーンは使用しない
  const udMMD = (skinnedMesh.geometry.userData.MMD = skinnedMesh.geometry.userData.MMD || {})
  // 元のIKリンク情報はクランプ推定に使用するため退避
  try {
    if (!udMMD.__origIks && Array.isArray(udMMD.iks)) {
      udMMD.__origIks = JSON.parse(JSON.stringify(udMMD.iks))
    }
  } catch {}
  udMMD.iks = []
  if (!helper.objects.get(skinnedMesh)) {
    const hasAmmo = !!(Ammo || (typeof window !== 'undefined' && window.Ammo))
    // three.jsのMMD IKは無効化（ik:false）
    helper.add(skinnedMesh, { physics: hasAmmo, ik: false, grant: true })
    helper.update(0)
  }
  skinnedMesh.skeleton?.update()
  ensureFloorRigidBody()
}

watch(showIkMarkers, v => {
  ikTargets.forEach(t => (t.marker.visible = v))
})
