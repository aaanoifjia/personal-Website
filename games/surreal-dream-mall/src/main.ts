import { Environment, Scene, SkyDome } from "@viggle/splat-engine";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const sceneStatus = document.querySelector<HTMLDivElement>("#scene-status");
const collisionStatus = document.querySelector<HTMLDivElement>("#collision-status");
const sceneFileInput = document.querySelector<HTMLInputElement>("#scene-file");
const colliderFileInput = document.querySelector<HTMLInputElement>("#collider-file");
const enterButton = document.querySelector<HTMLButtonElement>("#enter-game");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-player");
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreen");

if (!canvas || !sceneStatus || !collisionStatus || !sceneFileInput || !colliderFileInput || !enterButton || !resetButton || !fullscreenButton) {
  throw new Error("Required DOM elements are missing.");
}

const scene = await Scene.create(canvas, { fov: 64, depth: true });
scene.start();

SkyDome.create(scene, {
  topColor: "#1c2748",
  bottomColor: "#d9a9ba",
});

const player = new THREE.Vector3(0, 0.12, 3.05);
const spawn = player.clone();
const keys = new Set<string>();
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const tempDirection = new THREE.Vector3();
const tempOrigin = new THREE.Vector3();

const EYE_HEIGHT = 0.46;
const PLAYER_RADIUS = 0.11;
const MAX_STEP = 0.14;
const MAX_DROP = 0.38;
const WALK_SPEED = 0.92;
const RUN_SPEED = 1.55;

let yaw = 0;
let pitch = 0;
let environmentLoaded = false;
let colliderMeshes: THREE.Mesh[] = [];

const setSceneStatus = (message: string) => { sceneStatus.textContent = message; };
const setCollisionStatus = (message: string) => { collisionStatus.textContent = message; };

function updateCamera() {
  scene.cameraEntity.setPosition(player.x, player.y, player.z);
  scene.cameraEntity.setEulerAngles(pitch, yaw, 0);
}

function worldNormalForHit(hit: THREE.Intersection) {
  if (!hit.face) return null;
  const normal = hit.face.normal.clone();
  normal.transformDirection(hit.object.matrixWorld);
  return normal;
}

function findFloor(x: number, z: number, eyeY: number): number | null {
  if (colliderMeshes.length === 0) return eyeY - EYE_HEIGHT;

  const footY = eyeY - EYE_HEIGHT;
  tempOrigin.set(x, footY + MAX_STEP + 0.06, z);
  raycaster.set(tempOrigin, down);
  raycaster.near = 0;
  raycaster.far = MAX_STEP + MAX_DROP + 0.7;

  const hits = raycaster.intersectObjects(colliderMeshes, false);
  for (const hit of hits) {
    const normal = worldNormalForHit(hit);
    if (normal && normal.y > 0.35) return hit.point.y;
  }
  return null;
}

function snapToFloor() {
  const floor = findFloor(player.x, player.z, player.y);
  if (floor !== null) player.y = floor + EYE_HEIGHT;
}

function resetPlayer() {
  player.copy(spawn);
  yaw = 0;
  pitch = 0;
  snapToFloor();
  updateCamera();
}

function blockedHorizontally(dx: number, dz: number) {
  if (colliderMeshes.length === 0) return false;

  tempDirection.set(dx, 0, dz);
  const distance = tempDirection.length();
  if (distance < 1e-6) return false;
  tempDirection.multiplyScalar(1 / distance);

  for (const offset of [-0.06, -0.24, -0.4]) {
    tempOrigin.set(player.x, player.y + offset, player.z);
    raycaster.set(tempOrigin, tempDirection);
    raycaster.near = 0;
    raycaster.far = distance + PLAYER_RADIUS;
    const hit = raycaster.intersectObjects(colliderMeshes, false)[0];
    if (hit && hit.distance <= distance + PLAYER_RADIUS) return true;
  }
  return false;
}

function tryMove(dx: number, dz: number) {
  if (Math.abs(dx) < 1e-7 && Math.abs(dz) < 1e-7) return;
  if (blockedHorizontally(dx, dz)) return;

  const nextX = player.x + dx;
  const nextZ = player.z + dz;

  if (colliderMeshes.length === 0) {
    player.x = nextX;
    player.z = nextZ;
    return;
  }

  const currentFloor = player.y - EYE_HEIGHT;
  const nextFloor = findFloor(nextX, nextZ, player.y);
  if (nextFloor === null) return;

  const delta = nextFloor - currentFloor;
  if (delta > MAX_STEP || delta < -MAX_DROP) return;

  player.x = nextX;
  player.z = nextZ;
  player.y = nextFloor + EYE_HEIGHT;
}

function tickPlayer(dt: number) {
  if (document.pointerLockElement !== canvas) return;

  let forward = 0;
  let right = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) forward += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) forward -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) right += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) right -= 1;
  if (forward === 0 && right === 0) return;

  const length = Math.hypot(forward, right) || 1;
  forward /= length;
  right /= length;

  const angle = THREE.MathUtils.degToRad(yaw);
  const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? RUN_SPEED : WALK_SPEED;
  const step = speed * Math.min(dt, 0.05);

  const forwardX = -Math.sin(angle);
  const forwardZ = -Math.cos(angle);
  const rightX = Math.cos(angle);
  const rightZ = -Math.sin(angle);

  const dx = (forwardX * forward + rightX * right) * step;
  const dz = (forwardZ * forward + rightZ * right) * step;

  tryMove(dx, 0);
  tryMove(0, dz);
}

async function loadEnvironment(url: string, label: string) {
  if (environmentLoaded) {
    setSceneStatus("A splat is already loaded. Refresh the page to switch scenes.");
    return;
  }

  try {
    setSceneStatus(`Loading ${label}… large PLY files can take a while.`);
    await Environment.load(scene, url);
    environmentLoaded = true;
    setSceneStatus(`${label} loaded. Click Enter or the scene, then use WASD + mouse.`);
    resetPlayer();
  } catch (error) {
    console.error(error);
    setSceneStatus(`Could not load ${label}. Refresh and try the alternate PINOC export.`);
  }
}

async function loadCollider(url: string, label: string) {
  try {
    setCollisionStatus(`Loading collision mesh: ${label}…`);
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    gltf.scene.updateMatrixWorld(true);

    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        object.updateMatrixWorld(true);
        meshes.push(object);
      }
    });

    if (meshes.length === 0) throw new Error("No mesh found in collider GLB.");
    colliderMeshes = meshes;
    setCollisionStatus(`${label} ready · ${meshes.length} collision mesh${meshes.length === 1 ? "" : "es"}.`);
    snapToFloor();
    updateCamera();
  } catch (error) {
    console.error(error);
    setCollisionStatus("Collider failed to load. Free movement still works, but walls/floors will not block the player.");
  }
}

async function exists(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

const base = import.meta.env.BASE_URL;
const defaultPly = `${base}assets/mall.ply`;
const defaultSpz = `${base}assets/mall.spz`;
const defaultCollider = `${base}assets/collider.glb`;

if (await exists(defaultCollider)) {
  await loadCollider(defaultCollider, "collider.glb");
} else {
  setCollisionStatus("Choose your collider .glb locally to enable floor/wall collision.");
}

if (await exists(defaultPly)) {
  await loadEnvironment(defaultPly, "mall.ply");
} else if (await exists(defaultSpz)) {
  await loadEnvironment(defaultSpz, "mall.spz");
} else {
  setSceneStatus("Choose the exported PINOC .ply (or .spz). PLY works directly; no conversion is required.");
}

sceneFileInput.addEventListener("change", async () => {
  const file = sceneFileInput.files?.[0];
  if (!file) return;
  await loadEnvironment(URL.createObjectURL(file), file.name);
});

colliderFileInput.addEventListener("change", async () => {
  const file = colliderFileInput.files?.[0];
  if (!file) return;
  await loadCollider(URL.createObjectURL(file), file.name);
});

enterButton.addEventListener("click", () => {
  if (environmentLoaded) void canvas.requestPointerLock();
});

canvas.addEventListener("click", () => {
  if (environmentLoaded && document.pointerLockElement !== canvas) void canvas.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  document.body.classList.toggle("playing", document.pointerLockElement === canvas);
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  yaw -= event.movementX * 0.075;
  pitch -= event.movementY * 0.075;
  pitch = THREE.MathUtils.clamp(pitch, -82, 82);
});

document.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyR") resetPlayer();
});

document.addEventListener("keyup", (event) => keys.delete(event.code));
resetButton.addEventListener("click", resetPlayer);

fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
});

scene.app.on("update", (dt: number) => {
  tickPlayer(dt);
  updateCamera();
});

updateCamera();
