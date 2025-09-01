import { ref, watch } from 'vue'
import * as THREE from 'three'

export const IK_MARKER_PIXEL_SIZE = 16
export const showIkMarkers = ref(true)
export const ikWarning = ref('')
export const selectedIK = ref(null)
export let ikTargets = []
export const extraIKBoneNames = []
export const extraIKChains = {}
let ikConfigLoaded = false

export async function loadIKConfig() {
  try {
    const res = await fetch('/ik-config.json')
    if (!res.ok) throw new Error('Config not found')
    const data = await res.json()
    extraIKBoneNames.push(...(data.extraIKBoneNames || []))
    if (data.extraIKChains) Object.assign(extraIKChains, data.extraIKChains)
  } catch (e) {
    console.warn('Failed to load IK config, applying defaults:', e)
    if (extraIKBoneNames.length === 0)
      extraIKBoneNames.push('左足ＩＫ', '右足ＩＫ')
    if (Object.keys(extraIKChains).length === 0)
      extraIKChains.default = [
        { target: '左足ＩＫ', effector: '左足首', links: ['左ひざ', '左足'] },
        { target: '右足ＩＫ', effector: '右足首', links: ['右ひざ', '右足'] }
      ]
  } finally {
    ikConfigLoaded = true
  }
}
export const ikConfigPromise = loadIKConfig()

export function getIKDefinitions(geometry, modelName = '') {
  let iks =
    geometry?.userData?.MMD?.ik ||
    geometry?.userData?.MMD?.iks ||
    geometry?.userData?.mmd?.ik ||
    geometry?.userData?.mmd?.iks ||
    geometry?.ik ||
    geometry?.iks ||
    []
  if (!Array.isArray(iks) || iks.length === 0) {
    const ud = geometry?.userData
    if (ud) {
      const loaderGeom =
        ud.MMDLoader?.geometry ||
        ud.mmdLoader?.geometry ||
        ud.MMDLoader ||
        ud.mmdLoader
      if (loaderGeom?.userData) {
        iks =
          loaderGeom.userData?.MMD?.ik ||
          loaderGeom.userData?.MMD?.iks ||
          loaderGeom.userData?.mmd?.ik ||
          loaderGeom.userData?.mmd?.iks ||
          loaderGeom.userData?.ik ||
          loaderGeom.userData?.iks ||
          iks
      }
      if ((Array.isArray(ud.ik) || Array.isArray(ud.iks)) && iks.length === 0) {
        iks = ud.ik || ud.iks
      }
      if (iks.length === 0 && ud.metadata) {
        iks = ud.metadata.ik || ud.metadata.iks || iks
      }
    }
    if (!iks || iks.length === 0) {
      const fallback = extraIKChains[modelName] || extraIKChains.default
      if (Array.isArray(fallback) && fallback.length > 0) {
        const bones = geometry?.userData?.MMD?.bones || []
        const resolve = v =>
          typeof v === 'number' ? v : bones.findIndex(b => b.name === v)
        iks = fallback.map(ik => ({
          target: resolve(ik.target),
          effector: resolve(ik.effector),
          links: (ik.links || []).map(l => {
            if (typeof l === 'number' || typeof l === 'string')
              return { index: resolve(l) }
            return { ...l, index: resolve(l.index) }
          })
        }))
      }
    }
  }
  if (Array.isArray(iks) && iks.length > 0) {
    ikWarning.value = ''
  } else {
    ikWarning.value = 'IK定義が見つかりません'
  }
  return Array.isArray(iks) ? iks : []
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
  if (!Array.isArray(iks) || iks.length === 0) {
    ikWarning.value = 'IK定義が見つかりません。追加IK設定を行ってください'
    return
  }
  iks.forEach(ik => {
    const target = bones[ik.target]
    if (!target) return
    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({ color: 0xff0000 })
    )
    marker.position.set(0, 0, 0)
    target.add(marker)
    ikTargets.push({ target, marker })
    scene.add(marker)
  })
}

export function updateIKMarkers(camera, renderer, raycaster) {
  const visible = showIkMarkers.value
  const height = renderer.domElement.clientHeight
  const fov = THREE.MathUtils.degToRad(camera.fov)
  let maxScale = 0
  ikTargets.forEach(t => {
    t.target.updateMatrixWorld(true)
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
  const iks = getIKDefinitions(skinnedMesh.geometry, skinnedMesh.name)
  if (!Array.isArray(iks) || iks.length === 0) return
  if (!helper.objects.get(skinnedMesh)) {
    skinnedMesh.geometry.userData.MMD =
      skinnedMesh.geometry.userData.MMD || {}
    skinnedMesh.geometry.userData.MMD.iks = iks
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
