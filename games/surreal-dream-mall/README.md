# Surreal Dream Mall

Standalone web-game prototype for the PINOC/JST-2 dream-mall scene.

## Current stack

- PINOC / JST-2 environment: `.ply` or `.spz`
- Gaussian splat renderer: `@viggle/splat-engine@0.3.2`
- PlayCanvas runtime: `playcanvas@2.23.3`
- First-person controller and collision raycasts: `three@0.170`
- Build/dev server: Vite

Viggle's current web engine directly supports `.ply` and `.spz` environment splats, so a successful PLY export is enough for development.

## Run locally

```bash
cd games/surreal-dream-mall
npm install
npm run dev
```

Then:

1. Click **Load PINOC .ply / .spz**
2. Select the exported PINOC scene
3. Click **Load collider .glb**
4. Select the collider GLB
5. Click **Enter**
6. Use WASD + mouse to explore

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
  mall.ply        # or mall.spz / mall.sog after compression
  collider.glb
```

The app checks `mall.ply` first, then `mall.spz`.

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

A true subdomain such as `dream-mall.example.com` requires DNS access to a custom domain. Until DNS/hosting is connected, this folder remains independently deployable as a Vite app.
