# Runtime assets

Place the PINOC/JST-2 scene export here as:

- `mall.spz` — visual Gaussian-splat environment.
- `collider.glb` — simplified invisible collision proxy.

The original uploaded collider is intentionally not committed as-is because it is about 20.5 MB and ~1.23M triangles. For browser gameplay it should be reduced to a much lighter proxy before use.

The app also supports loading an .spz file from the local file picker, so development can continue before `mall.spz` is committed.
