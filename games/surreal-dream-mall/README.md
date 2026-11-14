# Surreal Dream Mall

Standalone web-game prototype for the PINOC/JST-2 dream-mall scene.

## Current stack

- PINOC / JST-2 environment: `.sog` (preferred), `.ply`, or `.spz`
- Gaussian splat renderer: `@viggle/splat-engine@0.3.2`
- PlayCanvas runtime: `playcanvas@2.23.3`
- Third-person controller, follow camera, and collision raycasts: `three@0.170`
- Build/dev server: Vite

The deployed scene uses PlayCanvas SOG. The app also accepts `.ply` and `.spz`
for local iteration or compatibility with raw scene exports.

## Run locally

```bash
cd games/surreal-dream-mall
npm install
npm run dev
```

Then:

1. Wait for the hosted `mall.sog`, `collider-web.glb` (or `collider.glb`), and
   `player.glb` to load automatically; alternatively choose local files.
2. Select the exported PINOC scene
3. Click **Load collider .glb**
4. Select the collider GLB
5. Click **Enter**
6. Use WASD + mouse to explore in third person

Controls:

- WASD / arrow keys: move
- Mouse: look
- Shift: run
- R: reset player
- Esc: release pointer lock

## Asset layout for deployment

When assets are ready for permanent hosting:

```
public/assets/
  mall.sog            # preferred visual Gaussian-splat scene
  collider-web.glb    # preferred lightweight collision proxy
  collider.glb        # fallback collision proxy
  player.glb          # rigged Mixamo-style player character
```

The app checks `mall.sog`, then `mall.ply`, then `mall.spz`. It prefers
`collider-web.glb` and falls back to `collider.glb`.

## PLY / collider alignment

The supplied PINOC PLY and collider GLB are already in nearly the same coordinate system and scale. No initial scene-scale conversion is required.

Approximate bounds:

- PLY: X 8.84, Y 2.16, Z 9.50 units
- collider: X 7.91, Y 1.77, Z 8.46 units

## Production optimization

The current PLY is about 68 MB and contains ~1.05M splats. It is suitable for development, but should be compressed before public deployment.

Recommended production target: SOG using PlayCanvas SplatTransform:

```bash
npm install -g @playcanvas/splat-transform
splat-transform "Surreal Dream Mall.ply" mall.sog
```

SOG is the recommended PlayCanvas runtime format for web delivery.

## Deployment

The GitHub Pages workflow lives in the `aaanoifjia.github.io` repository. It
checks out this repository's `main` branch, builds it with Node 22, copies the
generated `dist/` into `surreal-dream-mall/`, and preserves the large assets.
Because the workflow is triggered from the Pages repository, a source-only
push needs a manual workflow dispatch until cross-repository triggering is
added.
