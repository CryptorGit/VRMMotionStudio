import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  solveLegIKTrackers,
  legIkTrackersByMesh
} from '../src/utils/ik.js'

// This test verifies that rotating or moving the knee tracker still
// runs the leg IK solver so that knee and ankle bones match their
// respective trackers.
describe('solveLegIKTrackers knee tracker interaction', () => {
  it('aligns knee and ankle bones with trackers after knee tracker movement', () => {
    const upper = new THREE.Bone()
    const knee = new THREE.Bone()
    const ankle = new THREE.Bone()
    const toe = new THREE.Bone()

    upper.add(knee)
    knee.position.set(0, -1, 0)
    knee.add(ankle)
    ankle.position.set(0, -1, 0)
    ankle.add(toe)
    toe.position.set(0, -0.5, 0)

    const mesh = new THREE.SkinnedMesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial()
    )
    mesh.add(upper)
    mesh.bind(new THREE.Skeleton([upper, knee, ankle, toe]))

    const legTracker = new THREE.Object3D()
    legTracker.position.set(0, -2, 0)
    const kneeTracker = new THREE.Object3D()
    kneeTracker.position.set(0, -1, 0)
    const footTracker = new THREE.Object3D()
    footTracker.position.set(0, -2.5, 0)

    mesh.add(legTracker)
    mesh.add(kneeTracker)
    mesh.add(footTracker)
    mesh.updateMatrixWorld(true)

    legIkTrackersByMesh.set(mesh, [
      {
        upper,
        knee,
        ankle,
        toe,
        legTracker,
        kneeTracker,
        footTracker,
        kneeLegLine: null,
        legFootLine: null,
        torsoRef: null
      }
    ])

    // Move the knee tracker to simulate rotation around the hip
    kneeTracker.position.set(0.2, -1, 0)
    kneeTracker.updateMatrixWorld(true)

    solveLegIKTrackers(mesh)

    const anklePos = ankle.getWorldPosition(new THREE.Vector3())
    const legTrackerPos = legTracker.getWorldPosition(new THREE.Vector3())
    expect(anklePos.distanceTo(legTrackerPos)).toBeLessThan(1e-3)

    const toePos = toe.getWorldPosition(new THREE.Vector3())
    const footTrackerPos = footTracker.getWorldPosition(new THREE.Vector3())
    const ankleToToe = toePos.clone().sub(anklePos).normalize()
    const ankleToFootTracker = footTrackerPos
      .clone()
      .sub(anklePos)
      .normalize()
    expect(ankleToToe.angleTo(ankleToFootTracker)).toBeLessThan(1e-3)
  })
})

