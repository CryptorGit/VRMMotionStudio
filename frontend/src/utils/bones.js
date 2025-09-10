import * as THREE from 'three'

export function isTipBone(bone) {
  return /(先|tip)$/i.test(bone?.name || '')
}

export function isSupportBone(bone, data = {}) {
  const name = (bone?.name || '').toLowerCase()
  return /補助|dummy|dmy|影|shadow/.test(name) || !!data?.grant
}

/**
 * 指定された軸ベクトルに対し、軸の入れ替えと符号反転を行う。
 * @param {THREE.Vector3} axis - 変換対象の軸ベクトル
 * @param {number[]} order - 新しい軸の並び。デフォルトは [0,1,2]
 * @param {number[]} sign - 各軸に掛ける符号。デフォルトは [1,1,1]
 * @returns {THREE.Vector3} 補正後の軸ベクトル
 */
export function adjustAxis(axis, order = [0, 1, 2], sign = [1, 1, 1]) {
  if (!axis) return null
  const src = [axis.x, axis.y, axis.z]
  return new THREE.Vector3(
    src[order[0]] * sign[0],
    src[order[1]] * sign[1],
    src[order[2]] * sign[2]
  )
}

/**
 * MMDと同じ回転順序をボーンに適用する。
 * 既に回転が適用されている場合は `reorder` で保持したまま順序を変更する。
 * @param {THREE.Bone[]} bones - 対象ボーン配列
 * @param {string} order - 設定する回転順序 (デフォルト 'ZYX')
 */
export function applyMmdRotationOrder(bones, order = 'ZYX') {
  if (!Array.isArray(bones)) return
  for (const bone of bones) {
    const euler = bone.rotation
    if (euler.x !== 0 || euler.y !== 0 || euler.z !== 0) {
      euler.reorder(order)
    } else {
      euler.order = order
    }
  }
}

/**
 * 各ボーンの現在のクォータニオンを `userData._origQuat` に保存する。
 * `applyBoneInheritance` を使用する前に呼び出し、基準姿勢を設定する。
 * @param {THREE.Bone[]} bones - 対象ボーン配列
 */
export function initBoneOriginalQuaternions(bones) {
  if (!Array.isArray(bones)) return
  for (const bone of bones) {
    const data = bone.userData || (bone.userData = {})
    data._origQuat = bone.quaternion.clone()
  }
}

// 作業用クォータニオンを使い回してアロケーションを抑える
const _qParent = new THREE.Quaternion()
const _x = new THREE.Vector3()
const _y = new THREE.Vector3()
const _z = new THREE.Vector3()
const _mat = new THREE.Matrix4()
const _qAxes = new THREE.Quaternion()
const _qTmp = new THREE.Quaternion()

/**
 * inheritRotation と inheritRatio に基づいて親ボーンの回転を子ボーンへ補間適用する。
 * 事前に各ボーンの `userData._origQuat` に基準クォータニオンを設定しておく必要がある。
 * @param {THREE.Bone[]} bones - 対象ボーン配列
 */
export function applyBoneInheritance(bones) {
  if (!Array.isArray(bones)) return
  for (const bone of bones) {
    const data = bone.userData || (bone.userData = {})
    const { inheritRotation, inheritRatio, _origQuat } = data
    if (!inheritRotation) continue
    const parent = bone.parent
    if (!(parent instanceof THREE.Bone)) continue
    if (!_origQuat) {
      console.warn(
        `applyBoneInheritance: _origQuat not set for bone "${bone.name}"`
      )
      continue
    }
    const ratio = inheritRatio ?? 1
    _qParent.identity().slerp(parent.quaternion, ratio)
    bone.quaternion.copy(_origQuat).multiply(_qParent)
    bone.rotation.setFromQuaternion(bone.quaternion, bone.rotation.order)
  }
}

/**
 * PMX から取得した軸情報を `bone.userData.localAxes` に設定し、
 * 情報が無い場合は親子ボーンの位置から推定して補完する。
 * @param {THREE.SkinnedMesh} skinnedMesh - 対象スキンドメッシュ
 */
export function ensureLocalAxes(skinnedMesh) {
  const bones = skinnedMesh?.skeleton?.bones
  const boneDatas = skinnedMesh?.geometry?.userData?.MMD?.bones
  if (!Array.isArray(bones) || !Array.isArray(boneDatas)) return

  skinnedMesh.updateMatrixWorld(true)

  const toVector3 = v => {
    if (!v) return null
    if (v.isVector3) return v.clone()
    if (Array.isArray(v)) return new THREE.Vector3().fromArray(v)
    if ('x' in v && 'y' in v && 'z' in v)
      return new THREE.Vector3(v.x, v.y, v.z)
    return null
  }

  const _world = new THREE.Vector3()
  const _child = new THREE.Vector3()
  const _parent = new THREE.Vector3()
  const fallbackX = new THREE.Vector3(1, 0, 0)
  const fallbackZ = new THREE.Vector3(0, 0, 1)

  bones.forEach((bone, idx) => {
    const data = boneDatas[idx]
    const ud = bone.userData || (bone.userData = {})
    const lx = data?.localAxes
    const xAxis = toVector3(lx?.xAxis || lx?.x)
    const zAxis = toVector3(lx?.zAxis || lx?.z)
    if (xAxis && zAxis) {
      ud.localAxes = { xAxis, zAxis }
      return
    }

    let y = new THREE.Vector3()
    const child = bone.children.find(c => c.isBone)
    if (child) {
      y
        .subVectors(
          child.getWorldPosition(_child),
          bone.getWorldPosition(_world)
        )
        .normalize()
    } else if (bone.parent && bone.parent.isBone) {
      y
        .subVectors(
          bone.getWorldPosition(_world),
          bone.parent.getWorldPosition(_parent)
        )
        .normalize()
    } else {
      y.set(0, 1, 0)
    }

    let x = fallbackX.clone()
    if (Math.abs(y.dot(x)) > 0.9) x.copy(fallbackZ)
    let z = new THREE.Vector3().crossVectors(x, y).normalize()
    x.crossVectors(y, z).normalize()

    ud.localAxes = { xAxis: x, zAxis: z }
  })
}

/**
 * ワールド座標系の回転をボーン固有のローカル軸に変換して適用する。
 * @param {THREE.Bone} bone - 対象ボーン
 * @param {THREE.Quaternion} quat - ワールド回転
 */
export function applyLocalAxisRotation(bone, quat) {
  if (!bone || !quat) return
  const axes = bone.userData?.localAxes
  if (!axes || !axes.xAxis || !axes.zAxis) {
    bone.quaternion.premultiply(quat)
    bone.rotation.setFromQuaternion(bone.quaternion, bone.rotation.order)
    return
  }
  _x.copy(adjustAxis(axes.xAxis, [0, 1, 2], [1, 1, -1])).normalize()
  _z.copy(adjustAxis(axes.zAxis, [0, 1, 2], [1, 1, -1])).normalize()
  _y.crossVectors(_z, _x).normalize()
  _mat.makeBasis(_x, _y, _z)
  _qAxes.setFromRotationMatrix(_mat)
  _qTmp.copy(_qAxes).invert()
  _qTmp.multiply(quat)
  _qTmp.multiply(_qAxes)
  bone.quaternion.premultiply(_qTmp)
  bone.rotation.setFromQuaternion(bone.quaternion, bone.rotation.order)
}

// --- Bone type markers (MMD-like view) ---
// Creates MMD-like 2D markers for visible bones.
// - ◎ : rotatable only
// - □ : translatable (with or without rotation)
// - IK target : orange □
// - Twist : cyan ◎
// - Fixed axis: purple line along axis
export function createBoneTypeMarkers(skinnedMesh, isPhysicsBone = () => false) {
  const bones = skinnedMesh?.skeleton?.bones || []
  const boneDatas = skinnedMesh?.geometry?.userData?.MMD?.bones || []
  const helpers = []
  const getData = bone => boneDatas[bones.indexOf(bone)] || {}
  const isFlag = (data, mask) => ((data?.flag || 0) & mask) !== 0
  const ROTATABLE = 0x02
  const TRANSLATABLE = 0x04
  const VISIBLE = 0x08
  const IK_FLAG = 0x20
  const FIX_AXIS = 0x400
  const LOCAL_AXES = 0x800

  const texCache = {}
  const getTexture = (shape, colorHex) => {
    const key = `${shape}_${colorHex}`
    if (!texCache[key]) {
      const size = 64
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, size, size)
      ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`
      ctx.lineWidth = 6
      if (shape === 'circle') {
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.strokeRect(4, 4, size - 8, size - 8)
      }
      const tex = new THREE.CanvasTexture(canvas)
      tex.needsUpdate = true
      tex.minFilter = THREE.LinearFilter
      tex.magFilter = THREE.LinearFilter
      tex.generateMipmaps = false
      texCache[key] = tex
    }
    return texCache[key]
  }

  bones.forEach(bone => {
    const data = getData(bone)
    if (isPhysicsBone(bone)) return
    if (!isFlag(data, VISIBLE)) return
    if (isTipBone(bone) || isSupportBone(bone, data)) return
    const name = (bone.name || '').toLowerCase()
    const isTwist =
      /捩|twist/.test(name) ||
      (data?.grant?.affectRotation && !data?.grant?.affectPosition)
    const rot = isFlag(data, ROTATABLE)
    const tra = isFlag(data, TRANSLATABLE)
    const ik = isFlag(data, IK_FLAG) || !!data?.ik
    const fx = isFlag(data, FIX_AXIS)

    let shape = tra ? 'square' : 'circle'
    let colorHex = 0xbb88ff
    if (ik) {
      shape = 'square'
      colorHex = 0xff8800
    } else if (isTwist) {
      colorHex = 0x66ffff
    } else if (rot && tra) {
      colorHex = 0x66ff66
    } else if (rot) {
      colorHex = 0xffff66
    } else if (tra) {
      colorHex = 0x6688ff
    } else {
      return
    }

    const material = new THREE.SpriteMaterial({
      map: getTexture(shape, colorHex),
      depthTest: false,
      depthWrite: false,
      transparent: true
    })
    const sprite = new THREE.Sprite(material)
    sprite.renderOrder = 998
    sprite.scale.set(0.15, 0.15, 0.15)
    sprite.visible = false
    bone.add(sprite)
    helpers.push(sprite)

    if (fx && data?.fixAxis) {
      const ax = new THREE.Vector3().fromArray(data.fixAxis).normalize().multiplyScalar(0.2)
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), ax])
      const mat = new THREE.LineBasicMaterial({ color: 0xcc66ff, depthTest: false, depthWrite: false })
      const line = new THREE.Line(geom, mat)
      line.renderOrder = 998
      line.visible = false
      bone.add(line)
      helpers.push(line)
    }
    // local axes indicator (optional small cross)
    if (isFlag(data, LOCAL_AXES) && data?.localXVector && data?.localZVector) {
      const x = new THREE.Vector3().fromArray(data.localXVector).normalize().multiplyScalar(0.15)
      const z = new THREE.Vector3().fromArray(data.localZVector).normalize().multiplyScalar(0.15)
      const gx = new THREE.BufferGeometry().setFromPoints([x.clone().negate(), x])
      const gz = new THREE.BufferGeometry().setFromPoints([z.clone().negate(), z])
      const lx = new THREE.Line(gx, new THREE.LineBasicMaterial({ color: 0xff8800, depthTest: false, depthWrite: false }))
      const lz = new THREE.Line(gz, new THREE.LineBasicMaterial({ color: 0x00ffaa, depthTest: false, depthWrite: false }))
      lx.renderOrder = lz.renderOrder = 998
      lx.visible = lz.visible = false
      bone.add(lx); bone.add(lz)
      helpers.push(lx, lz)
    }
  })
  return helpers
}
