# Agent rules — Surreal Dream Mall

## Goal

Build a browser-first exploratory 3D game around a PINOC/JST-2 Gaussian-splat environment.

## Architecture

- Treat `public/assets/mall.spz` as the visual world.
- Treat `public/assets/collider.glb` as invisible gameplay geometry only.
- Never derive collision directly from every Gaussian splat.
- Keep visual orientation/scale and collider orientation/scale in one configuration source once calibrated.
- Pin `@viggle/splat-engine` and the PlayCanvas version recommended by that package.
- Keep Vite `optimizeDeps.exclude = ["@viggle/splat-engine"]`; the engine relies on worker files that dependency pre-bundling can relocate.

## Performance

- Target desktop browser first.
- Keep collision geometry coarse; do not ship the original ~1.23M-triangle collider as runtime collision.
- Load the splat before secondary effects.
- Avoid adding post-processing until navigation and frame time are stable.

## Next implementation milestone

Create first-person WASD navigation with pointer lock and integrate the collider proxy using a concave/static collision representation. The visual splat and the collision mesh must remain aligned.
