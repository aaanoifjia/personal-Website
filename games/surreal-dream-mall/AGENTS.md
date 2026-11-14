# Agent rules — Surreal Dream Mall

## Goal

Build a browser-first exploratory 3D game around a PINOC/JST-2 Gaussian-splat environment.

## Architecture

- Treat `public/assets/mall.sog` as the preferred visual world; `.ply` and
  `.spz` remain supported fallbacks.
- Treat `public/assets/collider-web.glb` as the preferred invisible gameplay
  geometry, with `collider.glb` only as a fallback.
- Never derive collision directly from every Gaussian splat.
- Keep visual orientation/scale and collider orientation/scale in one configuration source once calibrated.
- Pin `@viggle/splat-engine` and the PlayCanvas version recommended by that package.
- Keep Vite `optimizeDeps.exclude = ["@viggle/splat-engine"]`; the engine relies on worker files that dependency pre-bundling can relocate.

## Performance

- Target desktop browser first.
- Keep collision geometry coarse; do not ship the original ~1.23M-triangle collider as runtime collision.
- Initialize input controls before loading large scene assets.
- Load the splat before secondary effects.
- Avoid adding post-processing until navigation and frame time are stable.

## Current gameplay baseline

- Use third-person WASD navigation, a pointer-locked follow camera, and a
  rigged Mixamo-style character with procedural idle/walk/run animation.
- Keep movement speed and gait cadence synchronized whenever either is tuned.
- The visual splat and the collision mesh must remain aligned.
