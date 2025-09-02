import * as THREE from 'three'
import { MMDIKSolver } from 'three/examples/jsm/animation/MMDIKSolver.js'

let solver = null
let skeleton = null

self.onmessage = e => {
  const { type, bones, iks, matrices } = e.data
  if (type === 'init') {
    const boneObjs = bones.map(b => {
      const bone = new THREE.Bone()
      bone.name = b.name
      return bone
    })
    boneObjs.forEach((bone, idx) => {
      const parent = bones[idx].parent
      if (parent !== null && parent !== undefined && parent >= 0) {
        boneObjs[parent].add(bone)
      }
    })
    skeleton = new THREE.Skeleton(boneObjs)
    const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    mesh.add(boneObjs[0])
    mesh.bind(skeleton)
    solver = new MMDIKSolver(mesh, iks)
  } else if (type === 'update') {
    if (!solver || !skeleton) return
    matrices.forEach((m, i) => {
      skeleton.bones[i].matrix.fromArray(m)
      skeleton.bones[i].matrix.decompose(
        skeleton.bones[i].position,
        skeleton.bones[i].quaternion,
        skeleton.bones[i].scale
      )
    })
    solver.update()
    const result = skeleton.bones.map(b => ({
      pos: b.position.toArray(),
      quat: b.quaternion.toArray(),
      scl: b.scale.toArray()
    }))
    self.postMessage({ type: 'updated', bones: result })
  }
}
