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
