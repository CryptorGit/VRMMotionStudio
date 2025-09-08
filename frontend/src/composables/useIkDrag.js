import * as THREE from 'three'
import { ref } from 'vue'
import { adjustAxis, applyLocalAxisRotation } from '../utils/bones.js'
import { selectedIK, ikTargets, normalizeBoneName, findBoneByName } from '../utils/ik.js'

export function useIkDrag({
  camera,
  renderer,
  controls,
  helper,
  currentMeshRef,
  enablePhysics,
  scheduleIKUpdate,
  updateIKMarkersBound
}) {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let dragPlane = null
  const dragPoint = new THREE.Vector3()
  const isRotating = ref(false)
  const quat = new THREE.Quaternion()
  let physicsWasEnabled = false
  function hasAfterPhysicsGrants(mesh) {
    try {
      const grants = mesh?.geometry?.userData?.MMD?.grants || []
      return grants.some(g => g?.isAfterPhysics)
    } catch { return false }
  }

  function resolveDraggableBone(selectedBone) {
    const mesh = currentMeshRef.value
    const bones = mesh?.skeleton?.bones || []
    const iks = mesh?.geometry?.userData?.MMD?.iks || []
    // IKトラッカー（Object3D）はそのまま返す
    if (!selectedBone?.isBone) {
      return { bone: selectedBone, index: -1 }
    }
    // Prefer stored chainIndex
    const stored = selectedIK.value?.chainIndex
    if (typeof stored === 'number' && stored >= 0 && stored < iks.length) {
      return { bone: bones[iks[stored].target], index: stored }
    }
    // Try by name heuristic: IK隕ｪ -> IK
    const norm = normalizeBoneName(selectedBone?.name)
    if (typeof norm === 'string' && /ik隕ｪ$/.test(norm)) {
      const targetName = norm.replace(/ik隕ｪ$/, 'ik')
      const targetIdx = bones.findIndex(b => normalizeBoneName(b.name) === targetName)
      if (targetIdx !== -1) {
        const chainIdx = iks.findIndex(ik => bones[ik.target] === bones[targetIdx])
        // Drag IK隕ｪ縺昴・繧ゅ・繧貞虚縺九☆縲ＤhainIdx 縺ｯ蜿ら・縺ｫ菫晄戟
        if (chainIdx !== -1) return { bone: selectedBone, index: chainIdx }
      }
      // IK隕ｪ縺ｮ蜷榊燕縺縺悟ｯｾ蠢廬K縺瑚ｦ九▽縺九ｉ縺ｪ縺・ｴ蜷医ｂ縲∬ｦｪ閾ｪ菴薙ｒ蜍輔°縺・
      return { bone: selectedBone, index: -1 }
    }
    // Fallback: same bone or chain containing this bone as link
    const byTarget = iks.findIndex(ik => bones[ik.target] === selectedBone)
    if (byTarget !== -1) return { bone: bones[iks[byTarget].target], index: byTarget }
    const byLink = iks.findIndex(ik => (ik.links || []).some(l => bones[l.index] === selectedBone))
    if (byLink !== -1) return { bone: bones[iks[byLink].target], index: byLink }
    return { bone: selectedBone, index: -1 }
  }

  function onPointerDown(event) {
    if (!renderer.value) {
      console.error('renderer is not initialized')
      return
    }
    const element = renderer.value.domElement
    if (!element) {
      console.error('renderer domElement is not initialized')
      return
    }
    element.setPointerCapture(event.pointerId)
    const rect = element.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera.value)
    const intersects = raycaster.intersectObjects(ikTargets.map(t => t.marker), false)
    if (intersects.length === 0) {
      selectedIK.value = null
      return
    }
    const target = ikTargets.find(t => t.marker === intersects[0].object)
    if (!target) return
    selectedIK.value = target
    physicsWasEnabled = enablePhysics.value
    const mesh = currentMeshRef.value
    // Keep physics enabled if model uses after-physics grants (so grant propagation runs during drag)
    if (physicsWasEnabled && mesh && !hasAfterPhysicsGrants(mesh)) {
      helper.value?.enable('physics', false)
      helper.value?.update(0)
    }
    if (event.button === 2) {
      event.preventDefault()
      isRotating.value = true
      controls.value.enabled = false
      return
    }
    if (event.button !== 0) return
    const pos = new THREE.Vector3()
    const { bone: targetBone } = resolveDraggableBone(selectedIK.value.target)
    targetBone.getWorldPosition(pos)
    // カメラ中心→IKトラッカー直線を法線とする平面
    const normal = new THREE.Vector3().subVectors(pos, camera.value.position).normalize()
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, pos)
    controls.value.enabled = false
  }

  function onPointerMove(event) {
    if (!selectedIK.value) {
      return
    }
    if (!renderer.value) {
      console.error('renderer is not initialized')
      return
    }
    const element = renderer.value.domElement
    if (!element) {
      console.error('renderer domElement is not initialized')
      return
    }
    if (isRotating.value) {
      const targetObj = selectedIK.value.target
      if (!targetObj) return
      if (targetObj.isBone) {
        const bone = targetObj
        let rotationAxis = bone.userData?.localAxes?.xAxis
        if (rotationAxis) {
          rotationAxis = adjustAxis(rotationAxis, [0, 1, 2], [1, 1, -1]).normalize()
        } else {
          console.warn(`localAxes missing for bone "${bone.name}", using Y axis`)
          rotationAxis = new THREE.Vector3(0, 1, 0)
        }
        const angle = event.movementX * 0.01
        quat.setFromAxisAngle(rotationAxis, angle)
        applyLocalAxisRotation(bone, quat)
        scheduleIKUpdate()
        return
      }
      if (targetObj.isObject3D) {
        const parent = targetObj.parent
        const pwq = parent ? parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion()
        const pwqInv = parent ? pwq.clone().invert() : new THREE.Quaternion()
        const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(pwq).normalize()
        const worldRight = new THREE.Vector3(1, 0, 0).applyQuaternion(pwq).normalize()
        const axisYLocal = worldUp.clone().applyQuaternion(pwqInv).normalize()
        const axisXLocal = worldRight.clone().applyQuaternion(pwqInv).normalize()
        const ax = (event.movementY || 0) * 0.01
        const ay = (event.movementX || 0) * 0.01
        const qx = new THREE.Quaternion().setFromAxisAngle(axisXLocal, ax)
        const qy = new THREE.Quaternion().setFromAxisAngle(axisYLocal, ay)
        targetObj.quaternion.premultiply(qy)
        targetObj.quaternion.premultiply(qx)
        targetObj.updateMatrixWorld(true)
        scheduleIKUpdate()
        return
      }
      return
    }
    // 毎フレーム、直線が垂線の平面を再構築
    const rect = element.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera.value)
    const curWorld = new THREE.Vector3()
    const { bone: target } = resolveDraggableBone(selectedIK.value.target)
    target.getWorldPosition(curWorld)
    const normal = new THREE.Vector3().subVectors(curWorld, camera.value.position).normalize()
    dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, curWorld)
    if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
      if (target) {
        const parent = target.parent
        // dragPoint is in world space
        if (parent && typeof parent.worldToLocal === 'function') {
          parent.updateMatrixWorld(true)
          parent.worldToLocal(dragPoint)
          target.position.copy(dragPoint)
          target.updateMatrixWorld(true)
          scheduleIKUpdate()
        } else if (!parent) {
          // Root-level object: position is already in world space
          target.position.copy(dragPoint)
          target.updateMatrixWorld(true)
          scheduleIKUpdate()
        } else {
          // Fallback: compute local via parent.matrixWorld inverse
          try {
            parent.updateMatrixWorld(true)
            const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert()
            const local = dragPoint.clone().applyMatrix4(inv)
            target.position.copy(local)
            target.updateMatrixWorld(true)
            scheduleIKUpdate()
          } catch (e) {
            console.warn('IK target parent missing worldToLocal method')
          }
        }
      }
    }
  }

  function onPointerUp(event) {
    renderer.value?.domElement?.releasePointerCapture(event?.pointerId)
    controls.value.enabled = true
    if (isRotating.value) {
      isRotating.value = false
    }
    dragPlane = null
    if (physicsWasEnabled) {
      const mesh = currentMeshRef.value
      helper.value?.enable('physics', true)
      helper.value?.objects.get(mesh)?.physics?.reset()
      helper.value?.update(0)
      physicsWasEnabled = false
    }
    if (selectedIK.value) {
      scheduleIKUpdate()

      const ikTarget = selectedIK.value.target;
      const chainIndex = selectedIK.value.chainIndex;

      console.log('selectedIK.value:', selectedIK.value); // 追加
      console.log('ikTarget:', ikTarget); // 追加
      console.log('chainIndex:', chainIndex); // 追加

      if (!ikTarget) {
        console.warn('selectedIK.value.target is undefined. Skipping IK target reset.');
        selectedIK.value = null;
        return;
      }

      const mesh = currentMeshRef.value

      let targetBone = null; // 再配置対象のボーン

      if (chainIndex !== null && chainIndex !== -1) {
        // PMXのIKチェーンに紐づくトラッカーの場合
        const iks = mesh.geometry.userData.MMD.iks;
        if (!iks || !Array.isArray(iks) || chainIndex >= iks.length) {
          console.warn('Invalid iks or chainIndex. Skipping IK target reset.');
          selectedIK.value = null;
          return;
        }
        const ikChain = iks[chainIndex];
        if (!ikChain || typeof ikChain.target === 'undefined') {
          console.warn('Invalid ikChain or ikChain.target. Skipping IK target reset.');
          selectedIK.value = null;
          return;
        }
        targetBone = mesh.skeleton.bones[ikChain.target];
      } else {
        // ランタイムIKトラッカーの場合 (chainIndex が null)
        // ikTarget.name から対応するボーンを特定
        const boneName = ikTarget.name.replace(/_IK_TRACKER$/, ''); // "_IK_TRACKER" を除去
        // トラッカー名からボーン名へのマッピング
        const trackerBoneNameMap = {
          '左膝': '左ひざ',
          '右膝': '右ひざ',
          '左腕': '左腕',
          '右腕': '右腕',
          '左肘': '左ひじ',
          '右肘': '右ひじ',
          '左手': '左手首',
          '右手': '右手首',
          '左足': '左足首',
          '右足': '右足首',
          '頭': '頭',
          '胸': '上半身',
          '腰': '下半身',
          '左手先': '左手首',
          '右手先': '右手首',
          '左足先': '左足首',
          '右足先': '右足首',
        };
        const actualBoneName = trackerBoneNameMap[boneName] || boneName;
        targetBone = findBoneByName(mesh.skeleton.bones, actualBoneName);

        if (!targetBone) {
          console.warn(`Could not find bone for runtime IK tracker: ${boneName} (mapped to ${actualBoneName}). Skipping IK target reset.`);
          selectedIK.value = null;
          return;
        }
        console.log('Found targetBone for runtime IK tracker:', targetBone);
      }

      const targetParent = ikTarget.parent

      console.log('effectorBone:', targetBone); // 追加
      console.log('targetParent:', targetParent); // 追加

      if (targetBone && targetParent) {
        // IK計算が完了した次のフレームで実行
        requestAnimationFrame(() => {
          // ★ここから追加ログ
          console.log('--- Before IK target reset (in rAF) ---');
          ikTargets.forEach(t => {
            const currentWorldPos = new THREE.Vector3();
            t.marker.getWorldPosition(currentWorldPos);
            console.log(`Marker ${t.marker.name} (current):`, currentWorldPos);
            if (t.actualBone) {
              const actualBoneWorldPos = new THREE.Vector3();
              t.actualBone.getWorldPosition(actualBoneWorldPos);
              console.log(`Bone ${t.actualBone.name} (current):`, actualBoneWorldPos);
            }
          });
          // ★ここまで追加ログ

          const worldPosition = new THREE.Vector3()
          targetBone.getWorldPosition(worldPosition) // 更新されたボーンのワールド座標を取得

          console.log('effectorBone worldPosition (after IK):', worldPosition); // ログ名を変更

          targetParent.updateMatrixWorld(true)
          const localPosition = targetParent.worldToLocal(worldPosition.clone())
          ikTarget.position.copy(localPosition) // IKターゲットの位置をボーンの位置に合わせる

          console.log('ikTarget new localPosition:', ikTarget.position); // ログ名を変更

          updateIKMarkersBound.value?.() // IKマーカーの位置を即時更新

          // ★ここから追加ログ
          console.log('--- After IK target reset and marker update (in rAF) ---');
          ikTargets.forEach(t => {
            const finalWorldPos = new THREE.Vector3();
            t.marker.getWorldPosition(finalWorldPos);
            console.log(`Marker ${t.marker.name} (final):`, finalWorldPos);
            if (t.actualBone) {
              const actualBoneWorldPos = new THREE.Vector3();
              t.actualBone.getWorldPosition(actualBoneWorldPos);
              console.log(`Bone ${t.actualBone.name} (final):`, actualBoneWorldPos);
            }
          });
          // ★ここまで追加ログ
        })
      } else {
        console.warn('Target bone or target parent is invalid. Skipping IK target reset.');
        selectedIK.value = null;
      }
    }
    selectedIK.value = null
  }

  function onControlStart() {
    physicsWasEnabled = enablePhysics.value
    const mesh = currentMeshRef.value
    if (physicsWasEnabled && mesh && !hasAfterPhysicsGrants(mesh)) {
      helper.value?.enable('physics', false)
    }
  }

  function onControlEnd() {
    if (physicsWasEnabled) {
      const mesh = currentMeshRef.value
      helper.value?.enable('physics', true)
      helper.value?.objects.get(mesh)?.physics?.reset()
      physicsWasEnabled = false
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp, onControlStart, onControlEnd, isRotating }
}
