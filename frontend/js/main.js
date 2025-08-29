import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/controls/OrbitControls.js';
import { MMDLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/animation/MMDAnimationHelper.js';
import { OutlineEffect } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/effects/OutlineEffect.js';
import Ammo from 'https://cdn.jsdelivr.net/npm/ammo.js@0.0.10/builds/ammo.wasm.js';
import { API_BASE_URL } from './config.js';

let scene, camera, renderer, effect, controls, helper;
const clock = new THREE.Clock();

window.addEventListener('error', (e) => {
  console.error('Unhandled error:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

function logToServer(data) {
  fetch(`${API_BASE_URL}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    })
    .catch((err) => console.error('log error:', err));
}

async function init() {
  const container = document.getElementById('viewer');

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  effect = new OutlineEffect(renderer);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  const grid = new THREE.GridHelper(40, 40);
  scene.add(grid);

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 2000);
  camera.position.set(0, 10, 30);

  controls = new OrbitControls(camera, renderer.domElement);

  const ambient = new THREE.AmbientLight(0x666666);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff);
  directional.position.set(1, 1, 1);
  scene.add(directional);

  await Ammo();
  helper = new MMDAnimationHelper();

  window.addEventListener('resize', onWindowResize);

  console.log('API base URL:', API_BASE_URL);
  logToServer({ event: 'init' });

  animate();
}

function onWindowResize() {
  const container = document.getElementById('viewer');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (helper) helper.update(delta);
  effect.render(scene, camera);
}

init();

function handleFiles(files) {
  const fileMap = {};
  let modelFile = null;
  let poseFile = null;
  for (const file of files) {
    const path = file.webkitRelativePath || file.name;
    const shortPath = path.replace(/^[^/]*\//, '');
    fileMap[shortPath] = URL.createObjectURL(file);
    if (/\.(pmx|pmd)$/i.test(file.name)) modelFile = file;
    if (/\.vpd$/i.test(file.name)) poseFile = file;
  }
  if (!modelFile) return;

  const names = Array.from(files).map(f => f.name);
  console.log('Selected files:', names);
  logToServer({ event: 'select', files: names });

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const normalized = url.replace(/^\.\//, '');
    return fileMap[normalized] || url;
  });
  manager.onError = (url) => {
    console.error('Resource load failed:', url);
    logToServer({ event: 'resource-error', url });
  };

  const loader = new MMDLoader(manager);
  const modelPath = (modelFile.webkitRelativePath || modelFile.name).replace(/^[^/]*\//, '');
  const url = fileMap[modelPath];
  loader.load(
    url,
    (mesh) => {
      scene.add(mesh);
      helper.add(mesh, { physics: true });
      console.log('Model loaded:', modelFile.name);
      logToServer({ event: 'loaded', model: modelFile.name });

      if (poseFile) {
        const posePath = (poseFile.webkitRelativePath || poseFile.name).replace(/^[^/]*\//, '');
        const poseUrl = fileMap[posePath];
        loader.loadVPD(poseUrl, true, (pose) => {
          helper.pose(mesh, pose);
          console.log('Pose applied:', poseFile.name);
          logToServer({ event: 'pose', file: poseFile.name });
        });
      }

      for (const key in fileMap) {
        URL.revokeObjectURL(fileMap[key]);
      }
    },
    undefined,
    (error) => {
      const status = error && error.target && error.target.status;
      console.error('Load error:', status, error);
      logToServer({ event: 'error', message: error.message, status });
      for (const key in fileMap) {
        URL.revokeObjectURL(fileMap[key]);
      }
    }
  );
}

const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

const viewer = document.getElementById('viewer');
viewer.addEventListener('dragover', (e) => {
  e.preventDefault();
  viewer.classList.add('dragover');
});
viewer.addEventListener('dragleave', () => viewer.classList.remove('dragover'));
viewer.addEventListener('drop', (e) => {
  e.preventDefault();
  viewer.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

const menuButton = document.getElementById('menu-button');
const menuList = document.getElementById('menu-list');
const importOption = document.getElementById('import-option');

menuButton.addEventListener('click', () => {
  console.log('Menu button clicked');
  logToServer({ event: 'menu' });
  menuList.classList.toggle('hidden');
});

importOption.addEventListener('click', () => {
  console.log('Import option clicked');
  logToServer({ event: 'import' });
  fileInput.click();
  menuList.classList.add('hidden');
});
