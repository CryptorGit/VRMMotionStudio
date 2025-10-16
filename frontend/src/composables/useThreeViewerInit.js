import { markRaw } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function useThreeViewerInit({
  viewer,
  scene,
  camera,
  renderer,
  controls,
  ambientLight,
  directionalLight,
  directionalLightHelper,
  onControlStart,
  onControlEnd,
  onPointerDown,
  onWindowResize,
  gridHelper // グリッドヘルパーの参照を追加
}) {
  let resizeObserver = null

  function init() {
    const container = viewer.value
    if (!container) return

  renderer.value = markRaw(new THREE.WebGLRenderer({ antialias: true, alpha: true }))
  renderer.value.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.value.setClearColor(0x1d2028, 1)
  renderer.value.setSize(container.clientWidth || 1, container.clientHeight || 1, false)
    container.appendChild(renderer.value.domElement)

    scene.value = markRaw(new THREE.Scene())
    scene.value.background = new THREE.Color(0x20232b)

    const grid = new THREE.GridHelper(40, 40, 0x4a5162, 0x2d323f)
    grid.name = 'FloorGrid'
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach(mat => {
      mat.opacity = 0.32
      mat.transparent = true
      mat.depthWrite = false
    })
    scene.value.add(grid)
    
    // グリッドヘルパーの参照を保存
    if (gridHelper) {
      gridHelper.value = grid
    }

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(40, 1, 40),
      new THREE.MeshBasicMaterial({ color: 0x2c303a })
    )
    floorMesh.position.set(0, -0.5, 0)
    floorMesh.visible = false
    scene.value.add(floorMesh)

    camera.value = markRaw(
      new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000)
    )
    camera.value.position.set(0, 10, 30)

    controls.value = markRaw(new OrbitControls(camera.value, renderer.value.domElement))
    controls.value.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY
    }
    // 縦方向をY軸の縦方向に固定（ワールド座標のY軸を使用）
    controls.value.screenSpacePanning = true
    controls.value.enabled = true
    controls.value.addEventListener('start', onControlStart)
    controls.value.addEventListener('end', onControlEnd)

    scene.value.add(ambientLight.value)
    scene.value.add(directionalLight.value.target)
    scene.value.add(directionalLight.value)
    scene.value.add(directionalLightHelper)

    renderer.value.domElement.addEventListener('pointerdown', onPointerDown)

    window.addEventListener('resize', onWindowResize)

    resizeObserver = new ResizeObserver(() => onWindowResize())
    resizeObserver.observe(container)

    onWindowResize()
  }

  function cleanup() {
    window.removeEventListener('resize', onWindowResize)
    renderer.value?.domElement?.removeEventListener('pointerdown', onPointerDown)
    controls.value?.removeEventListener('start', onControlStart)
    controls.value?.removeEventListener('end', onControlEnd)
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  return { init, cleanup }
}

