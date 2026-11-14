import { Environment, Scene, SkyDome } from "@viggle/splat-engine";
import { Asset, Entity } from "playcanvas";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import "./style.css";
import { initMusicPlayer } from "./music-player";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const sceneStatus = document.querySelector<HTMLDivElement>("#scene-status");
const collisionStatus = document.querySelector<HTMLDivElement>("#collision-status");
const performanceStatus = document.querySelector<HTMLDivElement>("#performance-status");
const sceneFileInput = document.querySelector<HTMLInputElement>("#scene-file");
const colliderFileInput = document.querySelector<HTMLInputElement>("#collider-file");
const enterButton = document.querySelector<HTMLButtonElement>("#enter-game");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-player");
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreen");

if (!canvas || !sceneStatus || !collisionStatus || !performanceStatus || !sceneFileInput || !colliderFileInput || !enterButton || !resetButton || !fullscreenButton) {
  throw new Error("Required DOM elements are missing.");
}

// Main branch: first-person exploration. The playable third-person character
// version is preserved on backup/third-person-2026-11-14.
const DEFAULT_FOV = 50;
const MIN_FOV = 35;
const MAX_FOV = 70;
const FOV_ZOOM_SENSITIVITY = 0.025;
const scene = await Scene.create(canvas, { fov: DEFAULT_FOV, depth: true });
scene.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
scene.start();

SkyDome.create(scene, {
  topColor: "#1c2748",
  bottomColor: "#d9a9ba",
});

const player = new THREE.Vector3(0, 0.12, 3.05);
const visualPlayer = player.clone();
const spawn = player.clone();
const keys = new Set<string>();
const raycaster = new THREE.Raycaster();
const wallRaycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const tempDirection = new THREE.Vector3();
const tempOrigin = new THREE.Vector3();

const EYE_HEIGHT = 0.46;
const PLAYER_RADIUS = 0.11;
const MAX_STEP = 0.14;
const MAX_DROP = 0.38;
// Restore the original first-person exploration pace. No visible model or
// stride cycle needs to be synchronized with world translation.
const WALK_SPEED = 0.92;
const RUN_SPEED = 1.55;
const CAMERA_MIN_PITCH = -82;
const CAMERA_MAX_PITCH = 82;

let cameraYaw = 0;
let cameraPitch = 0;
let cameraFov = DEFAULT_FOV;
let targetFov = DEFAULT_FOV;
let environmentLoaded = false;
let colliderMeshes: THREE.Mesh[] = [];

const setSceneStatus = (message: string) => { sceneStatus.textContent = message; };
const setCollisionStatus = (message: string) => { collisionStatus.textContent = message; };

function updateCamera(dt = 1 / 60) {
  // Smooth camera height over irregular scanned floors; the camera is placed
  // at the player's eye, not offset behind a visible character.
  scene.cameraEntity.setPosition(visualPlayer.x, visualPlayer.y, visualPlayer.z);
  scene.cameraEntity.setEulerAngles(cameraPitch, cameraYaw, 0);

  const blend = 1 - Math.exp(-14 * Math.min(Math.max(dt, 0), 0.1));
  cameraFov += (targetFov - cameraFov) * blend;
  const camera = scene.cameraEntity.camera;
  if (camera) camera.fov = cameraFov;
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
  let closest: number | null = null;
  let closestDelta = Infinity;
  // Prefer continuity with the previous ground height, rather than blindly
  // accepting the first triangle (which can switch across scanned patches).
  for (const hit of hits) {
    const normal = worldNormalForHit(hit);
    if (!normal || normal.y < 0.65) continue;
    const delta = Math.abs(hit.point.y - footY);
    if (delta < closestDelta) {
      closest = hit.point.y;
      closestDelta = delta;
    }
  }
  return closest;
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
  cameraPitch = 0;
  cameraFov = DEFAULT_FOV;
  targetFov = DEFAULT_FOV;
  snapToFloor();
  visualPlayer.copy(player);
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
    wallRaycaster.set(tempOrigin, tempDirection);
    wallRaycaster.near = 0;
    wallRaycaster.far = distance + PLAYER_RADIUS;
    for (const hit of wallRaycaster.intersectObjects(colliderMeshes, false)) {
      if (hit.distance > distance + PLAYER_RADIUS) break;
      const normal = worldNormalForHit(hit);
      // The previous test also treated tiny slopes/ground triangles as
      // walls, producing start/stop motion on an irregular collider.
      if (normal && normal.y < 0.65) return true;
    }
  }
  return false;
}

function tryMove(dx: number, dz: number): boolean {
  if (Math.abs(dx) < 1e-7 && Math.abs(dz) < 1e-7) return false;
  if (blockedHorizontally(dx, dz)) return false;

  const nextX = player.x + dx;
  const nextZ = player.z + dz;

  if (colliderMeshes.length === 0) {
    player.x = nextX;
    player.z = nextZ;
    return true;
  }

  const currentFloor = player.y - EYE_HEIGHT;
  const nextFloor = findFloor(nextX, nextZ, player.y);
  if (nextFloor === null) return false;

  const delta = nextFloor - currentFloor;
  if (delta > MAX_STEP || delta < -MAX_DROP) return false;

  player.x = nextX;
  player.z = nextZ;
  player.y = nextFloor + EYE_HEIGHT;
  return true;
}

function updateVisualPlayer(dt: number) {
  // Frame-rate-independent smoothing. Horizontal and vertical physics motion
  // are separated so that tiny height changes don't shake the follow camera.
  const horizontalBlend = 1 - Math.exp(-18 * Math.min(dt, 0.1));
  const verticalBlend = 1 - Math.exp(-9 * Math.min(dt, 0.1));
  visualPlayer.x += (player.x - visualPlayer.x) * horizontalBlend;
  visualPlayer.z += (player.z - visualPlayer.z) * horizontalBlend;
  visualPlayer.y += (player.y - visualPlayer.y) * verticalBlend;
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

  const length = Math.hypot(forward, right);
  forward /= length;
  right /= length;

  const yawRadians = THREE.MathUtils.degToRad(cameraYaw);
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
  const step = (run ? RUN_SPEED : WALK_SPEED) * Math.min(dt, 0.1);
  const forwardX = -Math.sin(yawRadians);
  const forwardZ = -Math.cos(yawRadians);
  const rightX = Math.cos(yawRadians);
  const rightZ = -Math.sin(yawRadians);
  const dx = (forwardX * forward + rightX * right) * step;
  const dz = (forwardZ * forward + rightZ * right) * step;

  // Move diagonally first; slide along an axis if blocked by a wall.
  if (!tryMove(dx, dz)) {
    tryMove(dx, 0);
    tryMove(0, dz);
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
        // Dense colliders used to receive up to eight brute-force triangle
        // raycasts per movement frame. BVH reduces queries to nearby triangles.
        const geometry = object.geometry as THREE.BufferGeometry & { boundsTree?: MeshBVH };
        geometry.boundsTree ??= new MeshBVH(geometry, { maxLeafTris: 16 });
        object.raycast = acceleratedRaycast;
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
    visualPlayer.copy(spawn);

    const faceCount = meshes.reduce((sum, mesh) => {
      const geom = mesh.geometry;
      return sum + (geom.index ? geom.index.count / 3 : (geom.attributes.position?.count ?? 0) / 3);
    }, 0);
    setCollisionStatus(
      `${label} ready · ${Math.round(faceCount).toLocaleString()} triangles (BVH) · centered spawn.`,
    );
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
const defaultSog = `${base}assets/mall.sog`;
const defaultPly = `${base}assets/mall.ply`;
const defaultSpz = `${base}assets/mall.spz`;
const defaultCollider = `${base}assets/collider.glb`;
const optimizedCollider = `${base}assets/collider-web.glb`;

// No player.glb request: first-person main is intentionally body-less.
// Keep collision and splat loading concurrent so controls initialize early.
async function loadDefaultAssets() {
  await Promise.allSettled([
    (async () => {
      if (await exists(optimizedCollider)) {
        await loadCollider(optimizedCollider, "collider-web.glb");
      } else if (await exists(defaultCollider)) {
        await loadCollider(defaultCollider, "collider.glb");
      } else {
        setCollisionStatus("No collider found; movement will be unrestricted.");
      }
    })(),
    (async () => {
      if (await exists(defaultSog)) {
        await loadEnvironment(defaultSog, "mall.sog");
      } else if (await exists(defaultPly)) {
        await loadEnvironment(defaultPly, "mall.ply");
      } else if (await exists(defaultSpz)) {
        await loadEnvironment(defaultSpz, "mall.spz");
      } else {
        setSceneStatus("Choose mall.sog (recommended), or a .ply / .spz.");
      }
    })(),
  ]);
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
  if (!environmentLoaded) {
    setSceneStatus("Scene is still loading. Wait for mall.sog loaded.");
    return;
  }
  void canvas.requestPointerLock().catch((error) => {
    console.error("Pointer lock failed", error);
    setSceneStatus("Pointer lock failed. Click directly on the scene to retry.");
  });
});

canvas.addEventListener("click", () => {
  if (environmentLoaded && document.pointerLockElement !== canvas) {
    void canvas.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  const active = document.pointerLockElement === canvas;
  document.body.classList.toggle("playing", active);
  if (!active) keys.clear();
});

document.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement !== canvas) return;
  cameraYaw -= event.movementX * 0.075;
  cameraPitch -= event.movementY * 0.075;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch, CAMERA_MIN_PITCH, CAMERA_MAX_PITCH);
});

// Preserve the recently added mouse-wheel zoom as a first-person FOV change.
// Scrolling up narrows FOV (magnifies), scrolling down widens FOV.
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const deltaPixels = event.deltaY
    * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
  targetFov = THREE.MathUtils.clamp(
    targetFov + deltaPixels * FOV_ZOOM_SENSITIVITY,
    MIN_FOV,
    MAX_FOV,
  );
}, { passive: false });

document.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyR") resetPlayer();
});
document.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => keys.clear());
resetButton.addEventListener("click", resetPlayer);

fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
});

let perfFrames = 0;
let perfSeconds = 0;
let perfCpuMs = 0;
scene.app.on("update", (dt: number) => {
  const start = performance.now();
  tickPlayer(dt);
  updateVisualPlayer(dt);
  updateCamera(dt);

  perfFrames += 1;
  perfSeconds += dt;
  perfCpuMs += performance.now() - start;
  if (perfSeconds >= 1) {
    const fps = Math.round(perfFrames / perfSeconds);
    const cpuPerFrame = (perfCpuMs / perfFrames).toFixed(1);
    performanceStatus.textContent = `${fps} FPS · game logic ${cpuPerFrame}ms/frame`;
    perfFrames = 0;
    perfSeconds = 0;
    perfCpuMs = 0;
  }
});

updateCamera();
void loadDefaultAssets();
initMusicPlayer();
