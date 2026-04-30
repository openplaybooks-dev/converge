#!/usr/bin/env python3
"""tilemap_render.py — render terrain.json + tilesheet → tilemap.png.

Walks `terrain.json::tile_grid` and blits the matching frame from the
biome's tilesheet at each cell. Output is RGBA — cells with no tile
(passthrough/sky) are left fully transparent so the background shows
through when composited.

Reads:
  - assets/scenes/<id>/terrain.json
  - <tilesheet>.png + <tilesheet>.atlas.json (path resolved per arg)

Writes:
  - assets/scenes/<id>/tilemap.png

Usage:
  python scripts/tilemap_render.py <scene_id> [--tilesheet PATH]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from blocks_compile import find_project_root


def render_tilemap(
    terrain: dict,
    tilesheet_png: Path,
    tilesheet_atlas: Path,
) -> Image.Image:
    grid_w, grid_h = terrain["grid_size"]
    tile_size_px = int(terrain["tile_size_px"])
    tile_grid = terrain.get("tile_grid")
    if not tile_grid:
        raise ValueError("terrain.json missing 'tile_grid' (run scripts/scene_compose.py first)")

    atlas = json.loads(tilesheet_atlas.read_text(encoding="utf-8"))
    sheet = Image.open(tilesheet_png).convert("RGBA")
    frames: dict[str, Image.Image] = {}
    for f in atlas["frames"]:
        tile_id = f.get("tile_id") or f.get("filename", "").removesuffix(".png")
        box = f["frame"]
        crop = sheet.crop((box["x"], box["y"], box["x"] + box["w"], box["y"] + box["h"]))
        if crop.size != (tile_size_px, tile_size_px):
            crop = crop.resize((tile_size_px, tile_size_px), Image.LANCZOS)
        frames[tile_id] = crop

    canvas = Image.new("RGBA", (grid_w * tile_size_px, grid_h * tile_size_px), (0, 0, 0, 0))
    blit_count = 0
    missing: set[str] = set()
    for y in range(grid_h):
        for x in range(grid_w):
            tile_id = tile_grid[y][x]
            if tile_id is None:
                continue
            tile_img = frames.get(tile_id)
            if tile_img is None:
                missing.add(tile_id)
                continue
            canvas.alpha_composite(tile_img, (x * tile_size_px, y * tile_size_px))
            blit_count += 1

    if missing:
        print(f"warning: tile ids in terrain.json not in atlas: {sorted(missing)}", file=sys.stderr)
    print(f"blit {blit_count} tiles onto {canvas.size[0]}x{canvas.size[1]} canvas")
    return canvas


def resolve_tilesheet(scene_dir: Path, project_root: Path, biome: str, override: Path | None) -> tuple[Path, Path]:
    if override:
        png = override
        atlas = override.with_suffix(".atlas.json")
        if not atlas.exists():
            atlas = override.with_name(override.stem + ".atlas.json")
        return png, atlas

    # Per-scene tilesheet (existing layout)
    candidate = scene_dir / "tilesheet" / "tilesheet.png"
    if candidate.exists():
        return candidate, scene_dir / "tilesheet" / "tilesheet.atlas.json"

    # Per-biome tilesheet (new convention)
    candidate = project_root / "assets" / "tilesheets" / biome / "tilesheet.png"
    if candidate.exists():
        return candidate, candidate.with_suffix(".atlas.json")

    raise FileNotFoundError(
        f"no tilesheet found for scene {scene_dir.name} (biome '{biome}'). "
        f"Looked at {scene_dir / 'tilesheet'} and {project_root / 'assets/tilesheets' / biome}."
    )


def main() -> int:
    p = argparse.ArgumentParser(description="Render terrain.json + tilesheet → tilemap.png")
    p.add_argument("scene_id")
    p.add_argument("--tilesheet", help="explicit path to tilesheet.png")
    p.add_argument("--out", help="output path (default: assets/scenes/<id>/tilemap.png)")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    terrain_path = scene_dir / "terrain.json"
    if not terrain_path.exists():
        print(f"error: {terrain_path} not found", file=sys.stderr)
        return 1
    terrain = json.loads(terrain_path.read_text(encoding="utf-8"))
    biome = terrain.get("biome", "grassland")

    tilesheet_png, tilesheet_atlas = resolve_tilesheet(
        scene_dir, project_root, biome, Path(args.tilesheet) if args.tilesheet else None
    )
    print(f"using tilesheet {tilesheet_png}")

    img = render_tilemap(terrain, tilesheet_png, tilesheet_atlas)
    out = Path(args.out) if args.out else scene_dir / "tilemap.png"
    img.save(out)
    print(f"wrote {out} ({img.size[0]}x{img.size[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
