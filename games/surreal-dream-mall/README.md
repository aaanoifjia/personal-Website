# Surreal Dream Mall

A browser-first first-person dreamcore mall exploration game made from a
PINOC/JST-2 Gaussian-splat environment.

## Branches

- `main`: **first-person** camera, invisible player controller and optimized
  collision, splat rendering, music player, and FPS monitoring.
- `backup/third-person-2026-11-14`: **third-person backup** with visible,
  rigged Mixamo-style `player.glb`, procedural Idle/Walk/Run and follow camera.
  Do not overwrite this branch with first-person changes.

The corresponding deployed third-person snapshot, including hosted game assets,
is backed up in `aaanoifjia/aaanoifjia.github.io` on the same branch name.

## Technology

- Visual environment: Gaussian Splat `.sog` (preferred), `.ply`, or `.spz`
- Rendering: `@viggle/splat-engine@0.3.2` + PlayCanvas
- Navigation/collision: Three.js and `three-mesh-bvh`
- Bundler: Vite + TypeScript
- Music player: `src/music-player.ts` (bundled playlist, volume and local uploads)

## Start locally

```bash
cd games/surreal-dream-mall
npm install
npm run dev
```

Open the dev server and load `mall.sog` and `collider-web.glb` with
the file pickers, or put the files in `public/assets/` to load automatically.

## Controls on main

- **WASD / arrow keys:** walk relative to camera direction
- **Mouse:** look around (pointer lock)
- **Mouse wheel:** zoom by adjusting first-person field of view
- **Shift:** run
- **R:** reset position, direction, and field of view
- **Esc:** release pointer lock

The main branch does **not** load or display `player.glb`; no third-person
animation is executed. The asset remains available in the backup deployment
branch and on the hosting repository.

## Assets

Preferred relative game asset URLs:

```text
assets/mall.sog          # rendered environment
assets/collider-web.glb  # lightweight invisible collision proxy
assets/collider.glb      # fallback only
```

`mall.ply` and `mall.spz` are accepted as environment fallbacks.
Visual splat and collider coordinates must stay aligned.

The full original collider can be >1M triangles. Use the generated
`collider-web.glb` and BVH-accelerated raycasts for real-time navigation.

## Deployment

Game source: `aaanoifjia/personal-Website/games/surreal-dream-mall`.
Production site: https://aaanoifjia.github.io/surreal-dream-mall/

The workflow is in the Pages repository at
`.github/workflows/deploy-surreal-dream-mall.yml`. It checks out the source
`main` branch, builds Vite, copies `dist` into
`surreal-dream-mall/`, and preserves large uploaded assets. Source-only
commits require triggering that workflow manually.
