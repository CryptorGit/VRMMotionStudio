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
  onWindowResize
}) {
  function init() {
    const container = viewer.value

    renderer.value = markRaw(new THREE.WebGLRenderer({ antialias: true }))
    renderer.value.setPixelRatio(window.devicePixelRatio)
    renderer.value.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.value.domElement)

    scene.value = markRaw(new THREE.Scene())
    scene.value.background = new THREE.Color(0xeeeeee)

    const grid = new THREE.GridHelper(40, 40)
    scene.value.add(grid)

    const floorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(40, 1, 40),
      new THREE.MeshBasicMaterial({ color: 0xcccccc })
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
    controls.value.enabled = true
    controls.value.addEventListener('start', onControlStart)
    controls.value.addEventListener('end', onControlEnd)

    scene.value.add(ambientLight.value)
    scene.value.add(directionalLight.value.target)
    scene.value.add(directionalLight.value)
    scene.value.add(directionalLightHelper)

    renderer.value.domElement.addEventListener('pointerdown', onPointerDown)

    window.addEventListener('resize', onWindowResize)
  }

  function cleanup() {
    window.removeEventListener('resize', onWindowResize)
    renderer.value?.domElement?.removeEventListener('pointerdown', onPointerDown)
    controls.value?.removeEventListener('start', onControlStart)
    controls.value?.removeEventListener('end', onControlEnd)
  }

  return { init, cleanup }
}

