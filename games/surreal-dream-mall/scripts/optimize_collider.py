#!/usr/bin/env python3
"""Generate a lightweight GLB collider without changing the source mesh."""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
import trimesh

def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: optimize_collider.py <input.glb> <output.glb>")

    src, dst = map(Path, sys.argv[1:3])
    scene = trimesh.load(src, force="scene")
    if len(scene.geometry) != 1:
        raise ValueError("Expected one collision mesh; refusing to drop transforms")

    mesh = next(iter(scene.geometry.values()))
    vertices = np.asarray(mesh.vertices, dtype=np.float64)
    faces = np.asarray(mesh.faces, dtype=np.int64)
    if len(faces) < 100_000:
        dst.write_bytes(src.read_bytes())
        return

    # Source scene is about 8-9 units across: a 0.20-unit grid retains
    # walls and floors while eliminating sub-centimeter scan triangles.
    cell_size = 0.20
    cells = np.floor((vertices - vertices.min(axis=0)) / cell_size).astype(np.int64)
    _, inverse = np.unique(cells, axis=0, return_inverse=True)
    counts = np.bincount(inverse)
    reduced_vertices = np.stack([
        np.bincount(inverse, weights=vertices[:, i]) / counts
        for i in range(3)
    ], axis=1)

    reduced_faces = inverse[faces]
    distinct = (
        (reduced_faces[:, 0] != reduced_faces[:, 1])
        & (reduced_faces[:, 1] != reduced_faces[:, 2])
        & (reduced_faces[:, 0] != reduced_faces[:, 2])
    )
    reduced_faces = reduced_faces[distinct]
    _, unique_indices = np.unique(
        np.sort(reduced_faces, axis=1), axis=0, return_index=True
    )
    reduced_faces = reduced_faces[np.sort(unique_indices)]
    used, remap = np.unique(reduced_faces.ravel(), return_inverse=True)

    result = trimesh.Trimesh(
        vertices=reduced_vertices[used],
        faces=remap.reshape(-1, 3),
        process=False,
    )
    result.export(dst)
    print(
        f"Collider triangles {len(faces):,} -> {len(result.faces):,}; "
        f"size {src.stat().st_size // 1024:,} -> {dst.stat().st_size // 1024:,} KiB"
    )

if __name__ == "__main__":
    main()
