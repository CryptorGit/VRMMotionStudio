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
