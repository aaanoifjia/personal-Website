import { Environment, Scene, SkyDome } from "@viggle/splat-engine";
import { Asset, Entity } from "playcanvas";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const sceneStatus = document.querySelector<HTMLDivElement>("#scene-status");
const collisionStatus = document.querySelector<HTMLDivElement>("#collision-status");
const characterStatus = document.querySelector<HTMLDivElement>("#character-status");
const performanceStatus = document.querySelector<HTMLDivElement>("#performance-status");
const sceneFileInput = document.querySelector<HTMLInputElement>("#scene-file");
const colliderFileInput = document.querySelector<HTMLInputElement>("#collider-file");
const characterFileInput = document.querySelector<HTMLInputElement>("#character-file");
const enterButton = document.querySelector<HTMLButtonElement>("#enter-game");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-player");
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreen");

if (!canvas || !sceneStatus || !collisionStatus || !characterStatus || !performanceStatus || !sceneFileInput || !colliderFileInput || !characterFileInput || !enterButton || !resetButton || !fullscreenButton) {
  throw new Error("Required DOM elements are missing.");
}

const scene = await Scene.create(canvas, { fov: 50, depth: true });
// Cap pixel density for the ~1M-splat scene. Keep the original color/materials.
scene.app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
scene.start();

SkyDome.create(scene, {
  topColor: "#1c2748",
  bottomColor: "#d9a9ba",
});

const player = new THREE.Vector3(0, 0.12, 3.05);
// Keep collision/physics independent from the displayed position. Generated
// collider surfaces have slight unevenness, which previously propagated as
// visible shaking of both the character and follow camera.
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
// Match world translation to the procedural gait. One full sin() cycle
// includes a left and right step; the ground travel should be a fraction
// of the ~0.27 scene-unit-tall character, not multiple body lengths.
// Keep gait cadence unchanged when tuning how far the character moves.
const WALK_GAIT_RATE = 4.0; // radians per second
const RUN_GAIT_RATE = 6.4;
const WALK_STRIDE_DISTANCE = 0.18; // scene units per full gait cycle
const RUN_STRIDE_DISTANCE = 0.23;
const WALK_SPEED = WALK_STRIDE_DISTANCE * WALK_GAIT_RATE / (2 * Math.PI);
const RUN_SPEED = RUN_STRIDE_DISTANCE * RUN_GAIT_RATE / (2 * Math.PI);

const CHARACTER_SCALE = 0.0015; // Half the original visual size (0.003).
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
let characterAsset: Asset | null = null;
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
type QuaternionSnapshot = { x: number; y: number; z: number; w: number };
const bones = new Map<BoneName, Entity>();
const bindRotation = new Map<BoneName, QuaternionSnapshot>();
const bindPosition = new Map<BoneName, TransformSnapshot>();

// Derived from the actual GLB joint orientations. Both upper arms start in
// an outward A/T-pose. Rotating each upper-arm's bind-local direction into a
// slightly splayed downward vector makes a relaxed, natural Idle stance.
// Left/right differ in local Z; blind +/-Euler rotations were incorrect.
const IDLE_LEFT_ARM = new THREE.Quaternion(0.6014, 0, -0.2716, 0.7514).normalize();
const IDLE_RIGHT_ARM = new THREE.Quaternion(0.6014, 0, 0.2716, 0.7514).normalize();
const LOCAL_X_AXIS = new THREE.Vector3(1, 0, 0);
const LOCAL_Y_AXIS = new THREE.Vector3(0, 1, 0);
const LOCAL_Z_AXIS = new THREE.Vector3(0, 0, 1);

const setSceneStatus = (message: string) => { sceneStatus.textContent = message; };
const setCollisionStatus = (message: string) => { collisionStatus.textContent = message; };
const setCharacterStatus = (message: string) => { characterStatus.textContent = message; };

function updateCharacterTransform() {
  if (!characterRoot) return;
  characterRoot.setPosition(visualPlayer.x, visualPlayer.y - EYE_HEIGHT, visualPlayer.z);
  characterRoot.setEulerAngles(0, characterYaw, 0);
}

function updateCamera() {
  const targetX = visualPlayer.x;
  const targetY = visualPlayer.y - EYE_HEIGHT + CAMERA_TARGET_HEIGHT;
  const targetZ = visualPlayer.z;

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
  cameraPitch = 14;
  characterYaw = 180;
  snapToFloor();
  visualPlayer.copy(player);
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
  const step = speed * Math.min(dt, 0.1);

  const forwardX = -Math.sin(angle);
  const forwardZ = -Math.cos(angle);
  const rightX = Math.cos(angle);
  const rightZ = -Math.sin(angle);

  const dx = (forwardX * forward + rightX * right) * step;
  const dz = (forwardZ * forward + rightZ * right) * step;

  // Solve the intended XZ displacement as one move. Only use axis sliding if
  // blocked, rather than snapping the floor height twice per animation frame.
  const beforeX = player.x;
  const beforeZ = player.z;
  if (!tryMove(dx, dz)) {
    tryMove(dx, 0);
    tryMove(0, dz);
  }
  isMoving = Math.hypot(player.x - beforeX, player.z - beforeZ) > 1e-5;

  if (isMoving) {
    // Face the stable intended input direction rather than the jitter-prone
    // per-frame collision result, which can oscillate between X and Z.
    const targetYaw = THREE.MathUtils.radToDeg(Math.atan2(dx, dz));
    characterYaw = dampAngle(characterYaw, targetYaw, 12, dt);
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const delta = ((target - current + 540) % 360) - 180;
  return current + delta * (1 - Math.exp(-lambda * dt));
}

function setBoneOffset(name: BoneName, x = 0, y = 0, z = 0) {
  const bone = bones.get(name);
  const base = bindRotation.get(name);
  if (!bone || !base) return;

  // Work relative to the actual local bind quaternion, not Euler angles.
  // Apply the neutral arm correction even with zero walking input.
  const q = new THREE.Quaternion(base.x, base.y, base.z, base.w);
  if (name === "mixamorigLeftArm") q.multiply(IDLE_LEFT_ARM);
  if (name === "mixamorigRightArm") q.multiply(IDLE_RIGHT_ARM);
  if (x) q.multiply(new THREE.Quaternion().setFromAxisAngle(LOCAL_X_AXIS, THREE.MathUtils.degToRad(x)));
  if (y) q.multiply(new THREE.Quaternion().setFromAxisAngle(LOCAL_Y_AXIS, THREE.MathUtils.degToRad(y)));
  if (z) q.multiply(new THREE.Quaternion().setFromAxisAngle(LOCAL_Z_AXIS, THREE.MathUtils.degToRad(z)));
  bone.setLocalRotation(q.x, q.y, q.z, q.w);
}

function resetProceduralPose() {
  for (const name of boneNames) {
    setBoneOffset(name); // Arms hang naturally even when fully idle.
    const bone = bones.get(name);
    const position = bindPosition.get(name);
    if (bone && position) bone.setLocalPosition(position.x, position.y, position.z);
  }
}

function animateCharacter(dt: number) {
  if (!characterRoot || bones.size === 0) return;

  const targetBlend = isMoving ? 1 : 0;
  walkBlend += (targetBlend - walkBlend) * (1 - Math.exp(-10 * dt));

  if (isMoving) walkTime += dt * (isRunning ? RUN_GAIT_RATE : WALK_GAIT_RATE);

  const phase = Math.sin(walkTime);
  const legAmplitude = (isRunning ? 30 : 20) * walkBlend;
  const armAmplitude = (isRunning ? 19 : 12) * walkBlend;
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

  // Deliberately no hips/root translation while diagnosing jitter:
  // all walking motion is confined to arm/leg joint rotations.
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

async function loadCharacter(url: string, label: string) {
  try {
    setCharacterStatus(`Loading character: ${label}…`);
    const asset = new Asset(label, "container", { url, filename: label });
    scene.app.assets.add(asset);

    await new Promise<void>((resolve, reject) => {
      asset.ready(() => resolve());
      asset.once("error", (error) => reject(error));
      scene.app.assets.load(asset);
    });

    const resource = asset.resource;
    if (!resource) throw new Error("Character container loaded without a resource.");
    const root = resource.instantiateRenderEntity({ castShadows: false });
    root.name = "PlayerCharacter";
    root.setLocalScale(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE);

    // Replace only after the new GLB has successfully loaded. Keep the old
    // character visible on errors, and release the old model's resources.
    const previousRoot = characterRoot;
    const previousAsset = characterAsset;
    if (previousRoot) previousRoot.destroy();
    if (previousAsset) {
      scene.app.assets.remove(previousAsset);
      previousAsset.unload();
    }
    scene.app.root.addChild(root);
    characterRoot = root;
    characterAsset = asset;
    bones.clear();
    bindRotation.clear();
    bindPosition.clear();

    for (const name of boneNames) {
      const node = root.findByName(name);
      if (!(node instanceof Entity)) continue;
      bones.set(name, node);
      const rotation = node.getLocalRotation();
      const position = node.getLocalPosition();
      bindRotation.set(name, { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
      bindPosition.set(name, { x: position.x, y: position.y, z: position.z });
    }

    characterLoaded = true;
    walkTime = 0;
    walkBlend = 0;
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
const optimizedCollider = `${base}assets/collider-web.glb`;
const defaultCharacter = `${base}assets/player.glb`;

if (await exists(optimizedCollider)) {
  await loadCollider(optimizedCollider, "collider-web.glb");
} else if (await exists(defaultCollider)) {
  await loadCollider(defaultCollider, "collider.glb");
} else {
  setCollisionStatus("Choose a collider .glb locally to enable collision.");
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

// Character assets can be overwritten directly in GitHub Pages. Revalidate
// the original URL so browsers do not keep showing a previous player.glb.
// A stable ETag/Last-Modified key preserves caching until the file changes.
try {
  const response = await fetch(defaultCharacter, {
    method: "HEAD",
    cache: "no-store",
  });
  if (response.ok) {
    const revision = response.headers.get("etag")
      ?? response.headers.get("last-modified")
      ?? String(Date.now());
    const versionedCharacter = `${defaultCharacter}?rev=${encodeURIComponent(revision)}`;
    await loadCharacter(versionedCharacter, "player.glb");
  } else {
    setCharacterStatus("Upload the rigged character as assets/player.glb, or choose one locally.");
  }
} catch {
  setCharacterStatus("Could not check player.glb automatically. Use Load player .glb to preview it.");
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

let perfFrames = 0;
let perfSeconds = 0;
let perfCpuMs = 0;

scene.app.on("update", (dt: number) => {
  const start = performance.now();
  tickPlayer(dt);
  updateVisualPlayer(dt);
  animateCharacter(dt);
  updateCharacterTransform();
  updateCamera();

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
