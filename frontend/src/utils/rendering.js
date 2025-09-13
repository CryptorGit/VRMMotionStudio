export function createAnimator({
  clock,
  targetFps,
  helper,
  renderer,
  scene,
  camera,
  updateIKMarkers,
  directionalLightHelper,
  vrmGetter
}) {
  let lastFrameTime = 0
  let avgUpdate = 0
  let avgRender = 0
  let lastPerfLogTime = 0
  const smoothing = 0.1

  // DEV-only: SpringBone activity probe
  // Toggle with localStorage.setItem('springProbe', '0' | '1')
  const probeEnabled = () => import.meta.env.DEV && (typeof localStorage === 'undefined' || localStorage.getItem('springProbe') !== '0')
  const springProbe = new WeakMap()
  function getRuntimeSpringJoints(vrm) {
    const out = []
    const mgr = vrm?.springBoneManager
    if (!mgr) return out
    const direct = [mgr.joints, mgr._joints, mgr.springJoints, mgr._springJoints, mgr._jointList]
    for (const a of direct) if (Array.isArray(a)) for (const j of a) out.push(j)
    const maybeGroups = [mgr.boneGroups, mgr._boneGroups, mgr.groups, mgr._groups]
    for (const gArr of maybeGroups) {
      if (!Array.isArray(gArr)) continue
      for (const g of gArr) {
        try {
          const roots = [g?.root, g?.rootBone]
          for (const r of roots) if (r) out.push({ node: r })
          const arr = g?.joints || g?.bones || g?.links
          if (Array.isArray(arr)) arr.forEach(j => out.push(j))
        } catch {}
      }
    }
    if (Array.isArray(mgr.springs)) {
      for (const s of mgr.springs) {
        const arr = s?.joints || s?.bones || s?.links
        if (Array.isArray(arr)) arr.forEach(j => out.push(j))
      }
    }
    if (out.length === 0) {
      const visited = new Set()
      function scan(obj, depth = 0) {
        if (!obj || typeof obj !== 'object' || visited.has(obj) || depth > 50) return
        visited.add(obj)
        if (obj.node || obj.bone || obj.target || obj.joint) out.push(obj)
        if (Array.isArray(obj)) {
          for (const v of obj) scan(v, depth + 1)
        } else {
          for (const k in obj) scan(obj[k], depth + 1)
        }
      }
      try { scan(mgr) } catch {}
    }
    return out
  }
  function maybeProbeSpringBone(vrm, time) {
    if (!probeEnabled()) return
    if (!vrm?.scene) return
    let state = springProbe.get(vrm)
    if (!state) {
      const joints = getRuntimeSpringJoints(vrm)
      const nodes = []
      const seen = new Set()
      for (const j of joints) {
        const n = j?.node || j?.bone || j?.target || j?.joint
        if (!n || !n.isObject3D) continue
        if (seen.has(n)) continue
        seen.add(n)
        nodes.push(n)
        if (nodes.length >= 12) break
      }
      state = {
        nodes,
        lastP: nodes.map(() => new THREE.Vector3()),
        lastQ: nodes.map(() => new THREE.Quaternion()),
        movingFrames: 0,
        samples: 0,
        lastReport: 0,
        jointsCount: joints.length
      }
      // Seed last transforms
      for (let i = 0; i < nodes.length; i++) {
        try {
          nodes[i].updateWorldMatrix(true, false)
          nodes[i].getWorldPosition(state.lastP[i])
          nodes[i].getWorldQuaternion(state.lastQ[i])
        } catch {}
      }
      springProbe.set(vrm, state)
    }
    if (!state.nodes.length) return
    let anyChanged = false
    for (let i = 0; i < state.nodes.length; i++) {
      const n = state.nodes[i]
      if (!n) continue
      try {
        n.updateWorldMatrix(true, false)
        const p = new THREE.Vector3()
        const q = new THREE.Quaternion()
        n.getWorldPosition(p)
        n.getWorldQuaternion(q)
        const posDelta = p.distanceTo(state.lastP[i])
        const angle = 2 * Math.acos(Math.min(1, Math.max(-1, Math.abs(q.w * state.lastQ[i].w + q.x * state.lastQ[i].x + q.y * state.lastQ[i].y + q.z * state.lastQ[i].z))))
        if (posDelta > 1e-4 || angle > 1e-3) anyChanged = true
        state.lastP[i].copy(p)
        state.lastQ[i].copy(q)
      } catch {}
    }
    state.samples++
    if (anyChanged) state.movingFrames++
    if (time - state.lastReport > 2000) {
      try {
        const enabled = !!(vrm?.springBoneManager && (vrm.springBoneManager.enabled ?? vrm.springBoneManager.isEnabled?.()))
        console.debug('SpringProbe', {
          model: vrm?.scene?.name || '(unnamed)',
          enabled,
          joints: state.jointsCount,
          probeNodes: state.nodes.length,
          movingFrames: state.movingFrames,
          samples: state.samples
        })
      } catch {}
      state.lastReport = time
      state.movingFrames = 0
      state.samples = 0
    }
  }

  function animate(time) {
    requestAnimationFrame(animate)
    const delta = clock.getDelta()
    if (time - lastFrameTime < 1000 / targetFps) return
    lastFrameTime = time

    const updateStart = performance.now()
    if (helper.value) helper.value.update(delta)
    // Update VRM spring bones, lookAt, etc.
    try {
      const list = typeof vrmGetter === 'function' ? vrmGetter() : []
      if (Array.isArray(list)) {
        for (const v of list) {
          v?.update?.(delta)
          // DEV: run probe to verify spring activity
          try { maybeProbeSpringBone(v, time) } catch {}
        }
      }
    } catch {}
    const updateDuration = performance.now() - updateStart
    avgUpdate =
      avgUpdate === 0
        ? updateDuration
        : avgUpdate * (1 - smoothing) + updateDuration * smoothing

    updateIKMarkers()

    const renderStart = performance.now()
    if (scene.value && camera.value && renderer?.value?.render) {
      renderer.value.render(scene.value, camera.value)
    }
    const renderDuration = performance.now() - renderStart
    avgRender =
      avgRender === 0
        ? renderDuration
        : avgRender * (1 - smoothing) + renderDuration * smoothing

    directionalLightHelper.update()

    if (time - lastPerfLogTime >= 1000) {
      if (import.meta.env.DEV) {
        console.debug(
          `avg helper.update: ${avgUpdate.toFixed(2)}ms, avg render: ${avgRender.toFixed(2)}ms`
        )
      }
      lastPerfLogTime = time
    }
  }

  return animate
}

export function handleWindowResize(camera, renderer, container) {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}
