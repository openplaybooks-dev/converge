#!/usr/bin/env python3
"""scene_assemble.py — composite tilemap onto background → scene.png + scene.json.

The final step in the block-library scene pipeline. Reads the painted
background and the rendered tilemap, resamples them to a common canvas,
composites the tilemap on top of the background using the terrain grid
as alignment, and emits:

  - scene.png        — the playable scene as one image
  - scene.json       — engine manifest: paths, grid, beats, hazards,
                       block instances, dimensions

Reads:
  - assets/scenes/<id>/terrain.json
  - assets/scenes/<id>/background.png
  - assets/scenes/<id>/tilemap.png

Writes:
  - assets/scenes/<id>/scene.png
  - assets/scenes/<id>/scene.json

Resolution policy:
  By default `scene.png` is rendered at the *gameplay* resolution
  (`grid_size * tile_size_px`). The background is downsampled to match;
  the tilemap is composited 1:1. If `--resolution concept` is passed,
  output is at the *concept* resolution (`grid_size * concept_tile_px`)
  instead — the tilemap is upsampled.

Usage:
  python scripts/scene_assemble.py <scene_id>
  python scripts/scene_assemble.py <scene_id> --resolution concept
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from blocks_compile import find_project_root


def assemble_scene(
    terrain: dict,
    background_path: Path,
    tilemap_path: Path,
    *,
    resolution: str = "gameplay",
) -> Image.Image:
    grid_w, grid_h = terrain["grid_size"]
    tile_px = int(terrain["tile_size_px"])
    concept_px = int(terrain.get("concept_tile_px", 80))

    if resolution == "gameplay":
        target_w, target_h = grid_w * tile_px, grid_h * tile_px
    elif resolution == "concept":
        target_w, target_h = grid_w * concept_px, grid_h * concept_px
    else:
        raise ValueError(f"resolution must be 'gameplay' or 'concept', got {resolution!r}")

    bg = Image.open(background_path).convert("RGBA")
    if bg.size != (target_w, target_h):
        bg = bg.resize((target_w, target_h), Image.LANCZOS)

    tm = Image.open(tilemap_path).convert("RGBA")
    if tm.size != (target_w, target_h):
        tm = tm.resize((target_w, target_h), Image.NEAREST)

    out = bg.copy()
    out.alpha_composite(tm)
    return out


def build_scene_manifest(terrain: dict, scene_dir: Path) -> dict:
    """Engine-facing manifest. Pulls beats + hazards out of terrain."""
    grid_w, grid_h = terrain["grid_size"]
    tile_px = int(terrain["tile_size_px"])

    beats = terrain.get("beats") or []
    hazards = [
        b for b in beats
        if b.get("kind") in ("hazard", "spike", "fire")
    ]
    instances = terrain.get("block_instances") or []

    return {
        "scene_id": terrain.get("scene_id"),
        "biome": terrain.get("biome"),
        "grid_size": [grid_w, grid_h],
        "tile_size_px": tile_px,
        "world": {
            "width_px": grid_w * tile_px,
            "height_px": grid_h * tile_px,
        },
        "files": {
            "scene": "scene.png",
            "background": "background.png",
            "tilemap": "tilemap.png",
            "terrain": "terrain.json",
        },
        "beats": beats,
        "hazards": hazards,
        "block_instances": instances,
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Composite background + tilemap → scene.png")
    p.add_argument("scene_id")
    p.add_argument("--resolution", choices=("gameplay", "concept"), default="gameplay")
    p.add_argument("--background", help="path to background.png (default: scenes/<id>/background.png)")
    p.add_argument("--tilemap", help="path to tilemap.png (default: scenes/<id>/tilemap.png)")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    terrain_path = scene_dir / "terrain.json"
    if not terrain_path.exists():
        print(f"error: {terrain_path} not found", file=sys.stderr)
        return 1
    terrain = json.loads(terrain_path.read_text(encoding="utf-8"))

    bg_path = Path(args.background) if args.background else scene_dir / "background.png"
    tm_path = Path(args.tilemap) if args.tilemap else scene_dir / "tilemap.png"
    if not bg_path.exists():
        print(f"error: {bg_path} not found — run image-gen + skeleton steps first", file=sys.stderr)
        return 1
    if not tm_path.exists():
        print(f"error: {tm_path} not found — run scripts/tilemap_render.py first", file=sys.stderr)
        return 1

    img = assemble_scene(terrain, bg_path, tm_path, resolution=args.resolution)
    out_png = scene_dir / "scene.png"
    img.save(out_png)
    print(f"wrote {out_png} ({img.size[0]}x{img.size[1]})")

    manifest = build_scene_manifest(terrain, scene_dir)
    out_json = scene_dir / "scene.json"
    out_json.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out_json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
