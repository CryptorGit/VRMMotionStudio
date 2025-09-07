import * as THREE from 'three';

/**
 * Solve IK for arm trackers.
 * After elbow and shoulder rotations are computed, update hand tracker position
 * using wrist and optional finger trackers.
 * @param {Object} trackers - collection of trackers
 * @param {THREE.Object3D} trackers.armTracker
 * @param {THREE.Object3D} trackers.elbowTracker
 * @param {THREE.Object3D} trackers.handTracker
 * @param {THREE.Object3D} trackers.shoulderTracker
 * @param {THREE.Object3D} trackers.wrist
 * @param {THREE.Object3D} [trackers.finger1]
 */
export function solveArmIKTrackers(trackers) {
  const { armTracker, handTracker, wrist, finger1 } = trackers;

  // TODO: elbow and shoulder rotation calculations should happen before this.

  if (!armTracker || !handTracker || !wrist) {
    return;
  }

  // Retrieve world position of wrist and finger1 (if available)
  const wristWorld = new THREE.Vector3();
  wrist.getWorldPosition(wristWorld);

  let fingerWorld = null;
  if (finger1) {
    fingerWorld = new THREE.Vector3();
    finger1.getWorldPosition(fingerWorld);
  }

  // Convert to local coordinates of armTracker and handTracker
  const wristLocalToArm = armTracker.worldToLocal(wristWorld.clone());
  handTracker.position.copy(wristLocalToArm);

  if (fingerWorld) {
    // store finger1 local position relative to handTracker for further use
    handTracker.userData = handTracker.userData || {};
    handTracker.userData.finger1Local = handTracker.worldToLocal(fingerWorld.clone());
  }

  // Update matrix world to reflect new hand position
  handTracker.updateMatrixWorld(true);
}

/**
 * Determine whether a tracker has moved in world space since the last check.
 * This allows IK to be recomputed even when the parent moves.
 * @param {THREE.Object3D} tracker
 * @returns {boolean} true if moved
 */
export function moved(tracker) {
  if (!tracker) return false;

  const currentMatrixWorld = tracker.matrixWorld.clone();
  const last = tracker.userData.lastMatrixWorld;
  const changed = !last || !last.equals(currentMatrixWorld);
  tracker.userData.lastMatrixWorld = currentMatrixWorld;
  return changed;
}
