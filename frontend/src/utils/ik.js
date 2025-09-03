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

// Config loaded from /ik-config.json (optional)
export const extraIKBoneNames = []
export const extraIKChains = {}
export const ikAliases = new Map()

let cachedCamera = null
let cachedFov = null
let cachedFovRad = 0

// Minimal alias table (extend via ik-config.json)
const boneNameAliases = {
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
  'left toe': '左つま先'
}
const boneNameRegexes = []
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
      console.warn('createBoneIndexMap: canonical bone not found for alias', canon)
      ikWarning.value ||= `ボーン「${canon}」が見つかりません。ik-config.json の aliases に追加してください`
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
