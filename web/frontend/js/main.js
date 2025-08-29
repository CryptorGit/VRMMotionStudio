import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/controls/OrbitControls.js';
import { MMDLoader } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/animation/MMDAnimationHelper.js';
import { OutlineEffect } from 'https://cdn.jsdelivr.net/npm/three@0.164/examples/jsm/effects/OutlineEffect.js';
import Ammo from 'https://cdn.jsdelivr.net/npm/ammo.js@0.0.10/builds/ammo.wasm.js';

let scene, camera, renderer, effect, controls, helper;
const clock = new THREE.Clock();

async function init() {
  const container = document.getElementById('viewer');

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  effect = new OutlineEffect(renderer);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

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
  let modelFile = null;
  let poseFile = null;
  for (const file of files) {
    if (/\.(pmx|pmd)$/i.test(file.name)) modelFile = file;
    if (/\.vpd$/i.test(file.name)) poseFile = file;
  }
  if (!modelFile) return;

  const loader = new MMDLoader();
  const url = URL.createObjectURL(modelFile);
  loader.load(
    url,
    (mesh) => {
      scene.add(mesh);
      helper.add(mesh, { physics: true });

      if (poseFile) {
        const poseUrl = URL.createObjectURL(poseFile);
        loader.loadVPD(poseUrl, true, (pose) => {
          helper.pose(mesh, pose);
          URL.revokeObjectURL(poseUrl);
        });
      }

      URL.revokeObjectURL(url);
    },
    undefined,
    (error) => {
      console.error(error);
      URL.revokeObjectURL(url);
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
  menuList.classList.toggle('hidden');
});

importOption.addEventListener('click', () => {
  fileInput.click();
  menuList.classList.add('hidden');
});
