import {
  Environment,
  OrbitControls,
  Scene,
  SkyDome,
} from "@viggle/splat-engine";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const status = document.querySelector<HTMLDivElement>("#status");
const fileInput = document.querySelector<HTMLInputElement>("#scene-file");
const fullscreenButton = document.querySelector<HTMLButtonElement>("#fullscreen");

if (!canvas || !status || !fileInput || !fullscreenButton) {
  throw new Error("Required DOM elements are missing.");
}

const setStatus = (message: string) => {
  status.textContent = message;
};

setStatus("Starting the Viggle splat renderer…");

const scene = await Scene.create(canvas, {
  fov: 55,
  depth: true,
});

scene.start();

SkyDome.create(scene, {
  topColor: "#1d284d",
  bottomColor: "#e7b9c8",
});

const controls = new OrbitControls({
  distance: 4.2,
  pitch: 8,
  target: { x: 0, y: 0.6, z: 0 },
});

controls.attach({
  canvas,
  cameraEntity: scene.cameraEntity,
});

scene.app.on("update", () => controls.update());

let sceneLoaded = false;

async function loadEnvironment(url: string, label: string) {
  if (sceneLoaded) {
    setStatus("A scene is already loaded. Refresh the page before loading a different splat.");
    return;
  }

  try {
    setStatus(`Loading ${label}…`);
    await Environment.load(scene, url);
    sceneLoaded = true;
    setStatus(`${label} loaded. The project is ready for camera tuning and collision integration.`);
  } catch (error) {
    console.error(error);
    setStatus(`Could not load ${label}. Choose the exported .spz file manually.`);
  }
}

const defaultSceneUrl = `${import.meta.env.BASE_URL}assets/mall.spz`;

try {
  const response = await fetch(defaultSceneUrl, { method: "HEAD" });
  if (response.ok) {
    await loadEnvironment(defaultSceneUrl, "mall.spz");
  } else {
    setStatus("No mall.spz is committed yet. Use “Load PINOC .spz” to preview your exported scene locally.");
  }
} catch {
  setStatus("No mall.spz is committed yet. Use “Load PINOC .spz” to preview your exported scene locally.");
}

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  await loadEnvironment(url, file.name);
});

fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});
