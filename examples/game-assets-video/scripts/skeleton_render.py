#!/usr/bin/env python3
"""skeleton_render.py — render terrain.json → skeleton.png.

The skeleton is a flat-color schematic of the scene grid: one filled
rectangle per contiguous block of same-kind cells, palette from the
legend. It's the layout side of `background.base.png` (the painter
extends a small style anchor across the rest of the canvas using the
skeleton as positional guidance).

Output canvas size: `grid_size × concept_tile_px` (the "concept
canvas" — the resolution at which the painter sees the layout).

Reads:
  - assets/scenes/<id>/terrain.json

Writes:
  - assets/scenes/<id>/skeleton.png

Usage:
  python scripts/skeleton_render.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from blocks_compile import find_project_root
from lib.terrain_sketch import build_terrain_sketch


def render_skeleton(terrain: dict) -> Image.Image:
    grid_w, grid_h = terrain["grid_size"]
    tile_px = int(terrain.get("concept_tile_px", 80))
    src_w = grid_w * tile_px
    src_h = grid_h * tile_px

    # Background: pure black canvas. The painter sees `vast` cells as
    # transparent (they have null color) and treats the black as
    # "void to paint over with sky." Non-vast kinds are stamped as
    # colored rectangles by build_terrain_sketch.
    base = Image.new("RGBA", (src_w, src_h), (0, 0, 0, 255))
    overlay = build_terrain_sketch(
        terrain,
        src_w=src_w,
        src_h=src_h,
        api_w=src_w,
        api_h=src_h,
        tile_size_px=tile_px,
    )
    base.alpha_composite(overlay)
    return base


def main() -> int:
    p = argparse.ArgumentParser(description="Render terrain.json → skeleton.png")
    p.add_argument("scene_id")
    p.add_argument("--out", help="output path (default: assets/scenes/<id>/skeleton.png)")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    terrain_path = scene_dir / "terrain.json"
    if not terrain_path.exists():
        print(f"error: {terrain_path} not found — run scripts/scene_compose.py first", file=sys.stderr)
        return 1

    terrain = json.loads(terrain_path.read_text(encoding="utf-8"))
    img = render_skeleton(terrain)

    out = Path(args.out) if args.out else scene_dir / "skeleton.png"
    img.save(out)
    print(f"wrote {out} ({img.size[0]}x{img.size[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
