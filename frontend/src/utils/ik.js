import { ref, watch } from 'vue'
import * as THREE from 'three'

export const IK_MARKER_PIXEL_SIZE = 16
export const showIkMarkers = ref(true)
export const ikWarning = ref('')
export const selectedIK = ref(null)
export let ikTargets = []
export const extraIKBoneNames = []
export const extraIKChains = {}

let cachedFov = null
let cachedFovRad = 0

export async function loadIKConfig() {
  try {
    const res = await fetch('/ik-config.json')
    if (!res.ok) throw new Error('config fetch failed')
    const {
      extraIKBoneNames: boneNames = [],
      extraIKChains: chains = {}
    } = await res.json()
    extraIKBoneNames.push(...boneNames)
    Object.assign(extraIKChains, chains)
  } catch (e) {
    console.warn('Failed to load IK config, applying defaults:', e)
    if (extraIKBoneNames.length === 0) {
      extraIKBoneNames.push('左足ＩＫ', '右足ＩＫ')
    }
    if (Object.keys(extraIKChains).length === 0) {
      extraIKChains.default = [
        { target: '左足ＩＫ', effector: '左足首', links: ['左ひざ', '左足'] },
        { target: '右足ＩＫ', effector: '右足首', links: ['右ひざ', '右足'] }
      ]
    }
  }
}
export const ikConfigPromise = loadIKConfig()

export function attachIKParents(
  bones,
  iks,
  boneIndexMap = createBoneIndexMap(bones)
) {
  const ikParentRegex = /(?:IK|ＩＫ)親$/
  bones.forEach((b, idx) => {
    if (ikParentRegex.test(b.name)) {
      const ikName = b.name.replace(/(?:IK|ＩＫ)親$/, '')
      const targetIdx = boneIndexMap.get(normalizeBoneName(ikName))
      const chain = iks.find(ik => ik.target === targetIdx)
      if (
        chain &&
        typeof idx === 'number' &&
        !chain.links.some(l => l.index === idx)
      ) {
        // Disabled to preserve CCDIK adjacency: do not insert IK parent into link chain.
        // chain.links.unshift({ index: idx })
      }
    }
  })
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
  boneIndexMap = createBoneIndexMap(bones)
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
  '左ひざ': '左ひざ',
  '左膝': '左ひざ',
  'left knee': '左ひざ',
  '右足': '右足',
  'right foot': '右足',
  '左足': '左足',
  'left foot': '左足',
  '右足首': '右足首',
  'right ankle': '右足首',
  '左足首': '左足首',
  'left ankle': '左足首',
  '右つま先': '右つま先',
  'right toe': '右つま先',
  '右足先ex': '右つま先',
  '左つま先': '左つま先',
  'left toe': '左つま先',
  '左足先ex': '左つま先',
  '右膝ik': '右ひざik',
  '左膝ik': '左ひざik',
  'right knee ik': '右ひざik',
  'left knee ik': '左ひざik',
  '右足先ik': '右つま先ik',
  '左足先ik': '左つま先ik',
  // IK ボーンの英語・半角表記への対応
  'right leg ik': '右足ik',
  'right foot ik': '右足ik',
  'right ankle ik': '右足ik',
  'left leg ik': '左足ik',
  'left foot ik': '左足ik',
  'left ankle ik': '左足ik',
  'right toe ik': '右つま先ik',
  'left toe ik': '左つま先ik',
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
  { pattern: 'knee', suffix: 'ひざik' },
  { pattern: '(?:leg|foot|ankle)', suffix: '足ik' },
  { pattern: '(?:toe(?:' + sep + 'tip)?|foottip)', suffix: 'つま先ik' }
]
const boneNameRegexes = []
sidePatterns.forEach(s => {
  partPatterns.forEach(p => {
    boneNameRegexes.push({
      regex: new RegExp(`^${s.pattern}${sep}${p.pattern}${sep}ik$`),
      value: s.prefix + p.suffix
    })
    boneNameRegexes.push({
      regex: new RegExp(`^${p.pattern}${sep}ik${sep}${s.pattern}$`),
      value: s.prefix + p.suffix
    })
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

const createBoneIndexMap = bones =>
  new Map(bones.map((b, i) => [normalizeBoneName(b.name), i]))

function resolveIKLinks(
  iks,
  bones,
  boneIndexMap = createBoneIndexMap(bones)
) {
  const resolve = v =>
    typeof v === 'number' ? v : boneIndexMap.get(normalizeBoneName(v))
  const nameOf = v => {
    if (typeof v === 'object' && v !== null && 'index' in v) return nameOf(v.index)
    if (typeof v === 'number') return bones[v]?.name || v
    return v
  }
  return (Array.isArray(iks) ? iks : []).reduce((acc, ik) => {
    const target = resolve(ik.target)
    const effector = resolve(ik.effector)
    if (typeof target !== 'number' || typeof effector !== 'number') {
      console.warn('getIKDefinitions: unresolved bone in chain', {
        target: nameOf(ik.target),
        effector: nameOf(ik.effector)
      })
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

export function getIKDefinitions(geometry, modelName = '') {
  const bones = geometry?.userData?.MMD?.bones || []
  const boneIndexMap = createBoneIndexMap(bones)
  let iks = findUserDataIKs(geometry)
  iks = applyFallbackIKs(iks, bones, modelName, boneIndexMap)
  const originalCount = iks.length
  iks = resolveIKLinks(iks, bones, boneIndexMap)
  attachIKParents(bones, iks, boneIndexMap)
  iks = resolveIKLinks(iks, bones, boneIndexMap)
  const expected = extraIKChains[modelName] || extraIKChains.default || []
  expected.forEach(c => {
    const targetName = normalizeBoneName(
      typeof c.target === 'number' ? bones[c.target]?.name : c.target
    )
    const exists = iks.some(
      ik => normalizeBoneName(bones[ik.target]?.name) === targetName
    )
    if (!exists) {
      console.warn('getIKDefinitions: missing IK chain from config', {
        target: targetName
      })
    }
  })
  if (iks.length > 0) {
    ikWarning.value =
      originalCount > iks.length ? '一部のIKチェーンが無効です' : ''
  } else {
    ikWarning.value = originalCount > 0 ? 'IK定義が不完全' : 'IK定義が見つかりません'
  }
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
  const added = new Set()
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
  if (Array.isArray(iks) && iks.length > 0) {
    iks.forEach((ik, idx) => {
      const target = bones[ik.target]
      if (!target) return
      addMarker(target, idx)
      added.add(target)
    })
    ikWarning.value = ''
  } else {
    ikWarning.value = 'IK定義が見つかりません。追加IK設定を行ってください'
  }
  const chainBoneNames = new Set()
  iks.forEach(ik => {
    const indices = [ik.target, ik.effector, ...(ik.links || []).map(l => l.index)]
    indices.forEach(i => {
      const b = bones[i]
      if (b) chainBoneNames.add(normalizeBoneName(b.name))
    })
  })
  const missing = []
  extraIKBoneNames.forEach(name => {
    const target = bones.find(
      b => normalizeBoneName(b.name) === normalizeBoneName(name)
    )
    if (!target || added.has(target)) return
    if (!chainBoneNames.has(normalizeBoneName(name))) {
      missing.push(name)
      return
    }
    addMarker(target, -1)
    added.add(target)
  })
  if (missing.length > 0) {
    const msg = `IKチェーンに存在しないボーン: ${missing.join(', ')}`
    ikWarning.value = ikWarning.value ? `${ikWarning.value}\n${msg}` : msg
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
  if (!Array.isArray(iks) || iks.length === 0) return
  skinnedMesh.geometry.userData.MMD =
    skinnedMesh.geometry.userData.MMD || {}
  skinnedMesh.geometry.userData.MMD.iks = iks
  if (!helper.objects.get(skinnedMesh)) {
    helper.add(skinnedMesh, { physics: true, ik: true, grant: true })
  }
  skinnedMesh.skeleton?.update()
  ensureFloorRigidBody()
}

watch(showIkMarkers, v => {
  ikTargets.forEach(t => (t.marker.visible = v))
})
