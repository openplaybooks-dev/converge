#!/usr/bin/env python3
"""
generate_tile.py — Single image-gen call produces ONE tile.

Per-tile generation lets the model focus on a single tile design at a time,
which yields cleaner pixel art than asking it to draw a whole sheet at once.
The composite step (build_tilesheet.py) assembles the per-tile PNGs into
the final tilesheet grid.

Uses .templates/green_*.png as base ref so the tile renders with a solid
green background that the chroma keyer in image_api removes.

Usage:
  python scripts/generate_tile.py <tilemap_id> <tile_variant_id> [--seed N]

Outputs:
  assets/tile_maps/{tilemap_id}/tiles/{tile_id}/{tile_id}.png
  assets/tile_maps/{tilemap_id}/tiles/{tile_id}/{tile_id}.prompt.txt
  assets/tile_maps/{tilemap_id}/tiles/{tile_id}/{tile_id}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


def load_tilemap(project_root: Path, tilemap_id: str) -> dict:
    tm_file = project_root / "assets" / "tile_maps.json"
    tm_data = json.loads(tm_file.read_text(encoding="utf-8"))
    for tm in tm_data:
        if tm.get("id") == tilemap_id:
            return tm
    raise SystemExit(f"Tilemap '{tilemap_id}' not found in {tm_file}")


def find_tile_variant(tilemap: dict, tile_id: str) -> dict:
    variants = tilemap.get("tile_variants") or []
    for v in variants:
        if v.get("id") == tile_id:
            return v
    raise SystemExit(
        f"Tile variant '{tile_id}' not found in tilemap '{tilemap['id']}'. "
        f"Known: {[v['id'] for v in variants]}"
    )


def find_green_template(project_root: Path, working_resolution: int) -> Path:
    templates_dir = project_root / ".templates"
    candidates = sorted(templates_dir.glob("green_*.png"))
    if not candidates:
        raise SystemExit(
            f"No green_*.png templates in {templates_dir}. "
            f"Run scripts/create_green_template.py first."
        )
    for p in candidates:
        try:
            w_str = p.stem.split("_", 1)[1].split("x", 1)[0]
            if int(w_str) >= working_resolution:
                return p
        except (IndexError, ValueError):
            continue
    return candidates[-1]


def build_tile_prompt(tilemap: dict, variant: dict, working_resolution: int) -> str:
    from lib.art_styles import get_preset
    preset = get_preset(tilemap.get("art_style"))

    tile_id = variant["id"]
    layer = variant.get("layer", "base")
    description = variant.get("description", tile_id)
    tile_w, tile_h = tilemap.get("tile_dimensions", [16, 16])
    palette = tilemap.get("palette", "") or preset["palette_guidance"]
    palette_constraints = tilemap.get("palette_constraints", "")
    terrain_type = tilemap.get("terrain_type", "generic")

    spec = {
        "task": "generate_terrain_tile",
        "tilemap": tilemap.get("name", tilemap["id"]),
        "terrain_type": terrain_type,
        "tile_id": tile_id,
        "layer": layer,
        "in_game_tile_size": [tile_w, tile_h],
        "working_resolution": [working_resolution, working_resolution],
        "art_style": preset["style_name"],
        "art_style_description": preset["style_description"],
        "palette": palette,
        "palette_constraints": palette_constraints,
        "background": "Tile fills the entire canvas — terrain tiles are fully opaque blocks designed to butt up against neighboring tiles seamlessly",
        "critical_instructions": [
            f"Output is ONE tile at {working_resolution}x{working_resolution} pixels (will be downsized to {tile_w}x{tile_h} for in-game use)",
            "The tile is designed to TILE seamlessly with copies of itself horizontally and vertically — left/right edges should match, top/bottom edges should match where the layer permits",
            "No characters, no UI, no text, no labels, no borders",
            "Tile content fills the entire canvas — for base terrain (grass/dirt/stone) the tile is fully opaque; for sparse decoration tiles the empty space can be transparent (alpha=0)",
            *preset.get("negative_directives", []),
        ],
    }
    spec_json = json.dumps(spec, indent=2)

    return f"""Generate one terrain tile for the "{tilemap.get('name', tilemap['id'])}" tilemap.

ART STYLE (mandatory): {preset["style_description"]}

Tile design:
{description}

Tile metadata:
- ID: {tile_id}
- Layer: {layer}
- Terrain type: {terrain_type}
- In-game tile size: {tile_w}×{tile_h} pixels (the output will be downsized from {working_resolution}×{working_resolution})

The output is ONE image, exactly {working_resolution}×{working_resolution} pixels. For base/fill tiles the canvas is fully opaque (no background — the tile content covers the whole canvas). For sparse decoration tiles (single flower, pebble, mushroom) anything outside the decoration can be transparent (alpha=0).

The tile is designed to repeat seamlessly. Where the layer is "base" or "earth-fill", left/right and top/bottom edges should be content-matched so a horizontal/vertical repeat shows no seam. Decoration and detail tiles can be more centrally framed since they're sparse on the sheet.

Palette discipline:
{palette_constraints or preset['palette_guidance']}

Structured spec for reference:

{spec_json}
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("tilemap_id", help="Tilemap ID (must exist in assets/tile_maps.json or scenes.json)")
    ap.add_argument("tile_id", help="Tile variant ID (must exist in tilemap.tile_variants)")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument(
        "--scene-concept", default=None,
        help="Path to a scene concept image to add as a secondary reference. Pulls scene-level palette and depth into the tile prompt.",
    )
    ap.add_argument(
        "--out-root", default=None,
        help="Override the output directory root. Default: assets/tile_maps. Pass e.g. assets/scenes/{scene_id}/tilesheet to scope tiles per-scene.",
    )
    ap.add_argument(
        "--scene-id", default=None,
        help="Optional: when set, look up the tilemap inside scenes.json[scene].tilemap instead of tile_maps.json.",
    )
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    if args.scene_id:
        # Per-scene: tilemap config lives in scenes.json under the scene's `tilemap`
        scenes_path = project_root / "assets" / "scenes.json"
        scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
        scene = next((s for s in scenes if s.get("id") == args.scene_id), None)
        if scene is None:
            raise SystemExit(f"scene '{args.scene_id}' not found in scenes.json")
        tilemap = dict(scene.get("tilemap", {}))
        if not tilemap:
            raise SystemExit(f"scene '{args.scene_id}' has no tilemap section")
        tilemap.setdefault("id", args.tilemap_id)
        tilemap.setdefault("art_style", scene.get("art_style"))
    else:
        tilemap = load_tilemap(project_root, args.tilemap_id)
    variant = find_tile_variant(tilemap, args.tile_id)

    working_resolution = int(tilemap.get("working_resolution", 128))
    base_ref_path = find_green_template(project_root, working_resolution)

    if args.out_root:
        out_dir = Path(args.out_root) / "tiles" / args.tile_id
    else:
        out_dir = (
            project_root / "assets" / "tile_maps" / args.tilemap_id
            / "tiles" / args.tile_id
        )
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{args.tile_id}.png"
    prompt_path = out_dir / f"{args.tile_id}.prompt.txt"
    seed_path = out_dir / f"{args.tile_id}.seed.txt"

    prompt = build_tile_prompt(tilemap, variant, working_resolution)

    # Append scene concept as a secondary reference (in addition to the
    # green template) when given. Order matters for image-gen: base_image
    # is the dominant style anchor; reference_paths supply secondary style
    # cues. We keep the green template as the dominant base (because it's
    # the chroma-key target) and add concept as a reference image.
    extra_refs = []
    if args.scene_concept:
        extra_refs.append(Path(args.scene_concept))
    # Concept-driven asset extraction: the player walks on tiles in the
    # foreground, so the extracted near-layer crop (assets/scenes/<id>/
    # extracted/bg-near.png) is the closest stylistic match. Attaching it
    # as a 3rd reference locks tile texture/lighting to whatever the
    # concept image actually showed at ground level.
    if args.scene_id:
        extracted_near = (
            project_root / "assets" / "scenes" / args.scene_id
            / "extracted" / "bg-near.png"
        )
        if extracted_near.exists():
            extra_refs.append(extracted_near)

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    print(
        f"[{args.tilemap_id}/{args.tile_id}] generating tile at "
        f"{working_resolution}x{working_resolution} (layer={variant.get('layer', 'base')}) "
        f"base={base_ref_path.relative_to(project_root)} "
        f"+{len(extra_refs)} ref(s) backend={backend} cost={cost}¢",
        file=sys.stderr,
    )
    with budget.charged(project_root, cost, f"image-{backend}",
                        note=f"{args.tilemap_id}/{args.tile_id}"):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref_path,
            extra_refs,
            seed=args.seed,
            resolution=(working_resolution, working_resolution),
        )

    png_path.write_bytes(img_bytes)
    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(
        f"  wrote {png_path.relative_to(project_root)} (seed={seed_used})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
