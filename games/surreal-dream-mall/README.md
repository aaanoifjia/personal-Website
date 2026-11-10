# Surreal Dream Mall

Standalone web-game project for the PINOC/JST-2 dream-mall scene.

## Rendering stack

- PINOC / JST-2 scene export: `.spz`
- Gaussian splat renderer: `@viggle/splat-engine@0.3.2`
- Runtime renderer used by Viggle Splat Engine: `playcanvas@2.23.3`
- Build/dev server: Vite

The official Viggle web engine currently renders .spz environments through PlayCanvas rather than Three.js. This project uses the official path first for reliability; Three.js can still be used later for auxiliary systems if needed.

## Run

```bash
cd games/surreal-dream-mall
npm install
npm run dev
```

Export the scene from PINOC as `.spz`.

Either:

1. Copy it to `public/assets/mall.spz`; or
2. Open the page and use **Load PINOC .spz** to preview the file locally.

## Planned game steps

1. Lock final splat orientation, scale, and start camera.
2. Add the simplified collider GLB.
3. Replace orbit navigation with first-person WASD + pointer lock.
4. Add gravity, floor/step handling, and collision.
5. Add atmosphere, audio, interactions, and loading state.
6. Deploy the subproject as its own site and map a custom subdomain.

## Domain

A true subdomain such as `dream-mall.example.com` requires DNS control for the user's custom domain. GitHub Pages alone cannot create `dream-mall.aaanoifjia.github.io`. Until DNS/hosting is connected, this folder is structured as an independently deployable Vite app.
