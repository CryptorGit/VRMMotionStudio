import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  solveArmIKTrackers,
  armIkTrackersByMesh
} from '../src/utils/ik.js'

// Verify that rotating the shoulder tracker propagates to the arm and
// triggers recalculation so the wrist moves toward the wrist tracker.
describe('solveArmIKTrackers shoulder tracker interaction', () => {
  it('moves the wrist toward the arm tracker after shoulder rotation', () => {
    const shoulder = new THREE.Bone()
    const arm = new THREE.Bone()
    const elbow = new THREE.Bone()
    const wrist = new THREE.Bone()

    shoulder.add(arm)
    arm.position.set(0, -1, 0)
    arm.add(elbow)
    elbow.position.set(0, -1, 0)
    elbow.add(wrist)
    wrist.position.set(0, -1, 0)

    const mesh = new THREE.SkinnedMesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial()
    )
    mesh.add(shoulder)
    mesh.bind(new THREE.Skeleton([shoulder, arm, elbow, wrist]))

    const shoulderTracker = new THREE.Object3D()
    const elbowTracker = new THREE.Object3D()
    const armTracker = new THREE.Object3D()

    mesh.add(shoulderTracker)
    shoulderTracker.add(elbowTracker)
    elbowTracker.add(armTracker)

    elbowTracker.position.set(0, -1, 0)
    armTracker.position.set(0, -1, 0)

    mesh.updateMatrixWorld(true)

    armIkTrackersByMesh.set(mesh, [
      {
        shoulder,
        arm,
        elbow,
        wrist,
        effector: null,
        armTracker,
        handTracker: null,
        elbowTracker,
        shoulderTracker,
        finger1: null,
        shoulderElbowLine: null,
        elbowArmLine: null,
        armHandLine: null,
        torsoRef: null,
        upperLen: null,
        lowerLen: null
      }
    ])

    solveArmIKTrackers(mesh)
    const before = wrist.getWorldPosition(new THREE.Vector3()).distanceTo(
      armTracker.getWorldPosition(new THREE.Vector3())
    )

    shoulderTracker.rotation.z = 0.2
    shoulderTracker.updateMatrixWorld(true)
    solveArmIKTrackers(mesh)

    const after = wrist.getWorldPosition(new THREE.Vector3()).distanceTo(
      armTracker.getWorldPosition(new THREE.Vector3())
    )
    expect(after).toBeLessThan(before)
  })
})

