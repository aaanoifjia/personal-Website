import { Environment, Scene, SkyDome } from "@viggle/splat-engine";
import { Asset, Entity } from "playcanvas";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const sceneStatus = document.querySelector<HTMLDivElement>("#scene-status");
const collisionStatus = document.querySelector<HTMLDivElement>("#collision-status");
const characterStatus = document.querySelector<HTMLDivElement>("#character-status");
const sceneFileInput = document.querySelector<HTMLInputElement>("#scene-file");
const colliderFileInput = document.querySelector<HTMLInputElement>("#collider-file");
const characterFileInput = document.querySelector<HTMLInputElement>("#character-file");
const enterButton = document.querySelector<HTMLButtonElement>("#enter-game");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-player");
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreen");

if (!canvas || !sceneStatus || !collisionStatus || !characterStatus || !sceneFileInput || !colliderFileInput || !characterFileInput || !enterButton || !resetButton || !fullscreenButton) {
  throw new Error("Required DOM elements are missing.");
}

const scene = await Scene.create(canvas, { fov: 50, depth: true });
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

const CHARACTER_SCALE = 0.003;
const CAMERA_DISTANCE = 1.15;
const CAMERA_TARGET_HEIGHT = 0.34;
const CAMERA_MIN_PITCH = -18;
const CAMERA_MAX_PITCH = 50;

let cameraYaw = 0;
let cameraPitch = 14;
let characterYaw = 180;
let environmentLoaded = false;
let colliderMeshes: THREE.Mesh[] = [];
let characterRoot: Entity | null = null;
let characterLoaded = false;
let walkTime = 0;
let walkBlend = 0;
let isMoving = false;
let isRunning = false;

const boneNames = [
  "mixamorigHips",
  "mixamorigSpine",
  "mixamorigSpine1",
  "mixamorigSpine2",
  "mixamorigLeftArm",
  "mixamorigRightArm",
  "mixamorigLeftForeArm",
  "mixamorigRightForeArm",
  "mixamorigLeftUpLeg",
  "mixamorigRightUpLeg",
  "mixamorigLeftLeg",
  "mixamorigRightLeg",
  "mixamorigLeftFoot",
  "mixamorigRightFoot",
] as const;

type BoneName = (typeof boneNames)[number];
type TransformSnapshot = { x: number; y: number; z: number };
const bones = new Map<BoneName, Entity>();
const bindEuler = new Map<BoneName, TransformSnapshot>();
const bindPosition = new Map<BoneName, TransformSnapshot>();

const setSceneStatus = (message: string) => { sceneStatus.textContent = message; };
const setCollisionStatus = (message: string) => { collisionStatus.textContent = message; };
const setCharacterStatus = (message: string) => { characterStatus.textContent = message; };

function updateCharacterTransform() {
  if (!characterRoot) return;
  characterRoot.setPosition(player.x, player.y - EYE_HEIGHT, player.z);
  characterRoot.setEulerAngles(0, characterYaw, 0);
}

function updateCamera() {
  const targetX = player.x;
  const targetY = player.y - EYE_HEIGHT + CAMERA_TARGET_HEIGHT;
  const targetZ = player.z;

  const yawRad = THREE.MathUtils.degToRad(cameraYaw);
  const pitchRad = THREE.MathUtils.degToRad(cameraPitch);
  const horizontalDistance = CAMERA_DISTANCE * Math.cos(pitchRad);

  const cameraX = targetX + Math.sin(yawRad) * horizontalDistance;
  const cameraZ = targetZ + Math.cos(yawRad) * horizontalDistance;
  const cameraY = targetY + Math.sin(pitchRad) * CAMERA_DISTANCE;

  scene.cameraEntity.setPosition(cameraX, cameraY, cameraZ);
  scene.cameraEntity.lookAt(targetX, targetY, targetZ);
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

function findGroundFloorFromAbove(x: number, z: number, bounds: THREE.Box3): number | null {
  if (colliderMeshes.length === 0) return null;

  tempOrigin.set(x, bounds.max.y + 0.5, z);
  raycaster.set(tempOrigin, down);
  raycaster.near = 0;
  raycaster.far = bounds.max.y - bounds.min.y + 1.5;

  const walkable = raycaster
    .intersectObjects(colliderMeshes, false)
    .filter((hit) => {
      const normal = worldNormalForHit(hit);
      return normal !== null && normal.y > 0.35;
    });

  if (walkable.length === 0) return null;

  // The generated mall contains multiple height layers. For the first-person
  // spawn we want the ground floor, not an upper balcony/escalator surface.
  return Math.min(...walkable.map((hit) => hit.point.y));
}

function resetPlayer() {
  player.copy(spawn);
  cameraYaw = 0;
  cameraPitch = 14;
  characterYaw = 180;
  snapToFloor();
  resetProceduralPose();
  updateCharacterTransform();
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
  isMoving = false;
  isRunning = false;
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

  const angle = THREE.MathUtils.degToRad(cameraYaw);
  isRunning = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const speed = isRunning ? RUN_SPEED : WALK_SPEED;
  const step = speed * Math.min(dt, 0.05);

  const forwardX = -Math.sin(angle);
  const forwardZ = -Math.cos(angle);
  const rightX = Math.cos(angle);
  const rightZ = -Math.sin(angle);

  const dx = (forwardX * forward + rightX * right) * step;
  const dz = (forwardZ * forward + rightZ * right) * step;

  const beforeX = player.x;
  const beforeZ = player.z;
  tryMove(dx, 0);
  tryMove(0, dz);
  isMoving = Math.hypot(player.x - beforeX, player.z - beforeZ) > 1e-5;

  if (isMoving) {
    const actualDx = player.x - beforeX;
    const actualDz = player.z - beforeZ;
    const targetYaw = THREE.MathUtils.radToDeg(Math.atan2(actualDx, actualDz));
    characterYaw = dampAngle(characterYaw, targetYaw, 12, dt);
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const delta = ((target - current + 540) % 360) - 180;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function setBoneOffset(name: BoneName, x = 0, y = 0, z = 0) {
  const bone = bones.get(name);
  const base = bindEuler.get(name);
  if (!bone || !base) return;
  bone.setLocalEulerAngles(base.x + x, base.y + y, base.z + z);
}

function resetProceduralPose() {
  for (const name of boneNames) {
    const bone = bones.get(name);
    const baseEuler = bindEuler.get(name);
    const basePos = bindPosition.get(name);
    if (bone && baseEuler) bone.setLocalEulerAngles(baseEuler.x, baseEuler.y, baseEuler.z);
    if (bone && basePos) bone.setLocalPosition(basePos.x, basePos.y, basePos.z);
  }
}

function animateCharacter(dt: number) {
  if (!characterRoot || bones.size === 0) return;

  const targetBlend = isMoving ? 1 : 0;
  walkBlend += (targetBlend - walkBlend) * (1 - Math.exp(-10 * dt));

  if (isMoving) walkTime += dt * (isRunning ? 11.5 : 8.2);

  const phase = Math.sin(walkTime);
  const phase2 = Math.sin(walkTime * 2);
  const legAmplitude = (isRunning ? 34 : 24) * walkBlend;
  const armAmplitude = (isRunning ? 30 : 18) * walkBlend;
  const leftKnee = Math.max(0, -phase) * (isRunning ? 24 : 12) * walkBlend;
  const rightKnee = Math.max(0, phase) * (isRunning ? 24 : 12) * walkBlend;

  setBoneOffset("mixamorigLeftUpLeg", phase * legAmplitude);
  setBoneOffset("mixamorigRightUpLeg", -phase * legAmplitude);
  setBoneOffset("mixamorigLeftLeg", -leftKnee);
  setBoneOffset("mixamorigRightLeg", -rightKnee);
  setBoneOffset("mixamorigLeftArm", -phase * armAmplitude);
  setBoneOffset("mixamorigRightArm", phase * armAmplitude);
  setBoneOffset("mixamorigLeftForeArm", 0, 0, 5 * walkBlend);
  setBoneOffset("mixamorigRightForeArm", 0, 0, -5 * walkBlend);
  setBoneOffset("mixamorigSpine", 0, phase * 2.4 * walkBlend);
  setBoneOffset("mixamorigSpine1", 0, -phase * 1.8 * walkBlend);

  const hips = bones.get("mixamorigHips");
  const hipsBase = bindPosition.get("mixamorigHips");
  if (hips && hipsBase) {
    const bob = Math.abs(phase2) * (isRunning ? 1.7 : 1.0) * walkBlend;
    hips.setLocalPosition(hipsBase.x, hipsBase.y + bob, hipsBase.z);
  }
}

async function loadEnvironment(url: string, label: string) {
  if (environmentLoaded) {
    setSceneStatus("A splat is already loaded. Refresh the page to switch scenes.");
    return;
  }

  try {
    const lower = label.toLowerCase();
    setSceneStatus(`Loading ${label}…`);

    if (lower.endsWith(".sog")) {
      const asset = new Asset(label, "gsplat", { url, filename: label });
      scene.app.assets.add(asset);

      await new Promise<void>((resolve, reject) => {
        asset.ready(() => resolve());
        asset.once("error", (error) => reject(error));
        scene.app.assets.load(asset);
      });

      const splat = new Entity("Dream Mall SOG");
      splat.addComponent("gsplat", { asset });
      scene.app.root.addChild(splat);
    } else {
      await Environment.load(scene, url);
    }

    environmentLoaded = true;
    setSceneStatus(`${label} loaded. Click Enter or the scene, then use WASD + mouse.`);
    resetPlayer();
  } catch (error) {
    console.error(error);
    setSceneStatus(`Could not load ${label}. Try the SOG export or reload the page.`);
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

    // Derive the initial first-person position from the actual mall geometry.
    // The previous prototype used a temporary hard-coded Z=3.05, which puts
    // the camera outside the main room for this collider.
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const groundY = findGroundFloorFromAbove(center.x, center.z, bounds);

    spawn.set(
      center.x,
      (groundY ?? bounds.min.y) + EYE_HEIGHT,
      center.z,
    );
    player.copy(spawn);

    setCollisionStatus(
      `${label} ready · spawn centered at (${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)}).`,
    );
    updateCamera();
  } catch (error) {
    console.error(error);
    setCollisionStatus("Collider failed to load. Free movement still works, but walls/floors will not block the player.");
  }
}

async function loadCharacter(url: string, label: string) {
  if (characterLoaded) {
    setCharacterStatus("A character is already loaded. Refresh the page to switch characters.");
    return;
  }

  try {
    setCharacterStatus(`Loading character: ${label}…`);
    const asset = new Asset(label, "container", { url, filename: label });
    scene.app.assets.add(asset);

    await new Promise<void>((resolve, reject) => {
      asset.ready(() => resolve());
      asset.once("error", (error) => reject(error));
      scene.app.assets.load(asset);
    });

    const root = asset.resource.instantiateRenderEntity({ castShadows: false });
    root.name = "PlayerCharacter";
    root.setLocalScale(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE);
    scene.app.root.addChild(root);

    characterRoot = root;
    bones.clear();
    bindEuler.clear();
    bindPosition.clear();

    for (const name of boneNames) {
      const node = root.findByName(name);
      if (!(node instanceof Entity)) continue;
      bones.set(name, node);
      const euler = node.getLocalEulerAngles();
      const position = node.getLocalPosition();
      bindEuler.set(name, { x: euler.x, y: euler.y, z: euler.z });
      bindPosition.set(name, { x: position.x, y: position.y, z: position.z });
    }

    characterLoaded = true;
    resetProceduralPose();
    updateCharacterTransform();
    setCharacterStatus(`${label} ready · ${bones.size}/${boneNames.length} walk-control bones detected.`);
  } catch (error) {
    console.error(error);
    setCharacterStatus("Character failed to load. Make sure player.glb is a rigged GLB with the Mixamo skeleton.");
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
const defaultSog = `${base}assets/mall.sog`;
const defaultPly = `${base}assets/mall.ply`;
const defaultSpz = `${base}assets/mall.spz`;
const defaultCollider = `${base}assets/collider.glb`;
const defaultCharacter = `${base}assets/player.glb`;

if (await exists(defaultCollider)) {
  await loadCollider(defaultCollider, "collider.glb");
} else {
  setCollisionStatus("Choose your collider .glb locally to enable floor/wall collision.");
}

if (await exists(defaultSog)) {
  await loadEnvironment(defaultSog, "mall.sog");
} else if (await exists(defaultPly)) {
  await loadEnvironment(defaultPly, "mall.ply");
} else if (await exists(defaultSpz)) {
  await loadEnvironment(defaultSpz, "mall.spz");
} else {
  setSceneStatus("Choose mall.sog (recommended), or the original PINOC .ply / .spz.");
}

if (await exists(defaultCharacter)) {
  await loadCharacter(defaultCharacter, "player.glb");
} else {
  setCharacterStatus("Upload the rigged character as assets/player.glb, or choose one locally.");
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

characterFileInput.addEventListener("change", async () => {
  const file = characterFileInput.files?.[0];
  if (!file) return;
  await loadCharacter(URL.createObjectURL(file), file.name);
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
  cameraYaw -= event.movementX * 0.075;
  cameraPitch += event.movementY * 0.055;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch, CAMERA_MIN_PITCH, CAMERA_MAX_PITCH);
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
  animateCharacter(dt);
  updateCharacterTransform();
  updateCamera();
});

updateCamera();
