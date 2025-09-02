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
    if (!res.ok) throw new Error('Config not found')
    const data = await res.json()
    extraIKBoneNames.push(...(data.extraIKBoneNames || []))
    if (data.extraIKChains) {
      const resolved = {}
      const resolving = new Set()
      const resolve = key => {
        if (resolved[key]) return resolved[key]
        if (resolving.has(key)) return []
        resolving.add(key)
        const val = data.extraIKChains[key]
        let chains = []
        if (Array.isArray(val)) {
          chains = val.map(c => ({ ...c }))
        } else if (typeof val === 'string') {
          chains = resolve(val)
        } else if (val && typeof val === 'object') {
          const baseKey = val.ref || val.extends || val.use
          chains = baseKey ? resolve(baseKey).map(c => ({ ...c })) : []
          if (Array.isArray(val.chains)) {
            val.chains.forEach(o => {
              const idx = chains.findIndex(c => c.target === o.target)
              chains[idx !== -1 ? idx : chains.length] = {
                ...(chains[idx] || {}),
                ...o
              }
            })
          }
        }
        resolving.delete(key)
        resolved[key] = chains
        return chains
      }
      Object.keys(data.extraIKChains).forEach(k => resolve(k))
      Object.assign(extraIKChains, resolved)
    }
  } catch (e) {
    console.warn('Failed to load IK config, applying defaults:', e)
    if (extraIKBoneNames.length === 0)
      extraIKBoneNames.push('左足ＩＫ', '右足ＩＫ')
    if (Object.keys(extraIKChains).length === 0)
      extraIKChains.default = [
        { target: '左足ＩＫ', effector: '左足首', links: ['左ひざ', '左足'] },
        { target: '右足ＩＫ', effector: '右足首', links: ['右ひざ', '右足'] }
      ]
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
        chain.links.unshift({ index: idx })
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
  '左足先ex': '左つま先'
}

export function normalizeBoneName(name) {
  if (typeof name !== 'string') return name
  const n = name.normalize('NFKC').toLowerCase()
  return boneNameAliases[n] || n
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
        return
          typeof l === 'object' && l !== null && 'index' in l
            ? { ...l, index: idx }
            : { index: idx }
      })
      .filter(Boolean)
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
  extraIKBoneNames.forEach(name => {
    const target = bones.find(
      b => normalizeBoneName(b.name) === normalizeBoneName(name)
    )
    if (!target || added.has(target)) return
    addMarker(target, -1)
    added.add(target)
  })
}

export function updateIKMarkers(camera, renderer, raycaster, skipMatrixUpdate = false) {
  if (!camera || !renderer || ikTargets.length === 0) return
  const visible = showIkMarkers.value
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
    t.marker.visible = visible
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
  const bones = skinnedMesh.skeleton?.bones || []
  attachIKParents(bones, iks)
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
  try {
    ikTargets.forEach(t => (t.marker.visible = v))
  } catch (e) {
    console.error('Failed to toggle IK markers:', e)
  }
})
