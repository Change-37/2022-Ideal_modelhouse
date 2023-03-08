import { KeyDisplay } from "./utils";
import { CharacterControls } from "./characterControls";
import * as THREE from "three";
import { CameraHelper } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.y = 5;
camera.position.z = 0;
camera.position.x = 0;

// camera : 미리 정의한 카메라 객체
// document.body : 대상 엘리먼트. 포인터록 콘트롤은 브라우저 전체에 적용되므로 body에 연결해줘야 한다.

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

// camera : 미리 정의한 카메라 객체

// CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.minDistance = 10;
orbitControls.maxDistance = 20;
orbitControls.enablePan = false;
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
orbitControls.update();

// LIGHTS
light();

// FLOOR
generateFloor();

// MODEL WITH ANIMATIONS
const Cloader = new OBJLoader();

var characterControls: CharacterControls;
new GLTFLoader().load("models/Soldier.glb", function (gltf) {
  const model = gltf.scene;
  model.position.y = 0.1;
  model.traverse(function (object: any) {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(model);

  const gltfAnimations: THREE.AnimationClip[] = gltf.animations;
  const mixer = new THREE.AnimationMixer(model);
  const animationsMap: Map<string, THREE.AnimationAction> = new Map();
  gltfAnimations
    .filter((a) => a.name != "TPose")
    .forEach((a: THREE.AnimationClip) => {
      animationsMap.set(a.name, mixer.clipAction(a));
    });

  characterControls = new CharacterControls(
    model,
    mixer,
    animationsMap,
    orbitControls,
    camera,
    "Idle"
  );
});

// instantiate a loader
const loader = new OBJLoader();

// load a resource
loader.load(
  // resource URL
  "textures/objects/room.obj",
  // called when resource is loaded
  function (object) {
    object.position.set(10, 1, 4);
    object.scale.set(0.8, 0.8, 0.8);
    scene.add(object);
  },
  // called when loading is in progresses
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  // called when loading has errors
  function (error) {
    console.log("An error happened");
  }
);

// CONTROL KEYS
const keysPressed = {};
const keyDisplayQueue = new KeyDisplay();
document.addEventListener(
  "keydown",
  (event) => {
    keyDisplayQueue.down(event.key);
    if (event.shiftKey && characterControls) {
    } else {
      (keysPressed as any)[event.key.toLowerCase()] = true;
    }
  },
  false
);
document.addEventListener(
  "keyup",
  (event) => {
    keyDisplayQueue.up(event.key);
    (keysPressed as any)[event.key.toLowerCase()] = false;
  },
  false
);

const clock = new THREE.Clock();
// ANIMATE
function animate() {
  let mixerUpdateDelta = clock.getDelta();
  if (characterControls) {
    characterControls.update(mixerUpdateDelta, keysPressed);
  }
  orbitControls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
document.body.appendChild(renderer.domElement);
animate();

// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  keyDisplayQueue.updatePosition();
}
window.addEventListener("resize", onWindowResize);

function generateFloor() {
  // TEXTURES
  const textureLoader = new THREE.TextureLoader();
  const placeholder = textureLoader.load(
    "./textures/placeholder/placeholder.png"
  );
  const sandBaseColor = textureLoader.load(
    "./textures/floor/mint.png"
  );
  const sandNormalMap = textureLoader.load("./textures/floor/mint.png");
  const sandHeightMap = textureLoader.load("./textures/floor/mint.png");
  const sandAmbientOcclusion = textureLoader.load(
    "./textures/floor/mint.png"
  );

  const WIDTH = 100000;
  const LENGTH = 100000;

  const geometry = new THREE.PlaneGeometry(WIDTH, LENGTH, 512, 512);
  const material = new THREE.MeshStandardMaterial({
    map: sandBaseColor,
    normalMap: sandNormalMap,
    displacementMap: sandHeightMap,
    displacementScale: 0.1,
    aoMap: sandAmbientOcclusion,
  });
  wrapAndRepeatTexture(material.map);
  wrapAndRepeatTexture(material.normalMap);
  wrapAndRepeatTexture(material.displacementMap);
  wrapAndRepeatTexture(material.aoMap);
  // const material = new THREE.MeshPhongMaterial({ map: placeholder})

  const floor = new THREE.Mesh(geometry, material);
  floor.receiveShadow = true;
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
}

function wrapAndRepeatTexture(map: THREE.Texture) {
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.x = map.repeat.y = 10;
}

function light() {
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(-60, 100, -10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.width = 4096;
  dirLight.shadow.mapSize.height = 4096;
  scene.add(dirLight);
  // scene.add( new THREE.CameraHelper(dirLight.shadow.camera))
}