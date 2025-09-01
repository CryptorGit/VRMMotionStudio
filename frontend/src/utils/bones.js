import * as THREE from 'three'

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
 * @param {THREE.Bone[]} bones - 対象ボーン配列
 */
export function applyBoneInheritance(bones) {
  if (!Array.isArray(bones)) return
  for (const bone of bones) {
    const { inheritRotation, inheritRatio } = bone.userData || {}
    if (!inheritRotation) continue
    const parent = bone.parent
    if (!(parent instanceof THREE.Bone)) continue
    const ratio = inheritRatio ?? 1
    _qParent.copy(parent.quaternion)
    bone.quaternion.slerp(_qParent, ratio)
    bone.rotation.setFromQuaternion(bone.quaternion, bone.rotation.order)
  }
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
    bone.quaternion.multiply(quat)
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
  bone.quaternion.multiply(_qTmp)
  bone.rotation.setFromQuaternion(bone.quaternion, bone.rotation.order)
}
