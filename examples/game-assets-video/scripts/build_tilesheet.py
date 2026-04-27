#!/usr/bin/env python3
"""
build_tilesheet.py — Composite per-tile PNGs into a tilesheet + atlas.

NO image-gen — pure pixel work. Reads:
  - assets/tile_maps.json   (for sheet_grid + tile_dimensions + variant order)
  - assets/tile_maps/{tilemap_id}/tiles/{tile_id}/{tile_id}.png  (each variant)

Writes:
  assets/tile_maps/{tilemap_id}/tilesheet/tilesheet.png
  assets/tile_maps/{tilemap_id}/tilesheet/tilesheet.atlas.json
  assets/tile_maps/{tilemap_id}/tilesheet/tilesheet.prompt.txt   (concatenated debug prompts)

Tile order on the sheet matches tile_variants order in the manifest.
If there are fewer tiles than grid cells the trailing cells stay empty.
If there are more than grid cells the extras are dropped (with a warning).

Usage:
  python scripts/build_tilesheet.py <tilemap_id>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib.sprite import find_project_root


def load_tilemap(project_root: Path, tilemap_id: str, scene_id: str | None = None) -> dict:
    if scene_id:
        scenes_path = project_root / "assets" / "scenes.json"
        scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
        scene = next((s for s in scenes if s.get("id") == scene_id), None)
        if scene is None:
            raise SystemExit(f"scene '{scene_id}' not found in scenes.json")
        tilemap = dict(scene.get("tilemap", {}))
        if not tilemap:
            raise SystemExit(f"scene '{scene_id}' has no tilemap section")
        tilemap.setdefault("id", tilemap_id)
        return tilemap
    tm_file = project_root / "assets" / "tile_maps.json"
    tm_data = json.loads(tm_file.read_text(encoding="utf-8"))
    for tm in tm_data:
        if tm.get("id") == tilemap_id:
            return tm
    raise SystemExit(f"Tilemap '{tilemap_id}' not found in {tm_file}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("tilemap_id", help="Tilemap ID (must exist in assets/tile_maps.json or scenes.json)")
    ap.add_argument(
        "--scene-id", default=None,
        help="When set, look up tilemap config inside scenes.json[scene].tilemap instead of tile_maps.json.",
    )
    ap.add_argument(
        "--out-root", default=None,
        help="Override the output root. Default: assets/tile_maps/{tilemap_id}. Pass e.g. assets/scenes/{scene_id}/tilesheet to scope per-scene.",
    )
    args = ap.parse_args()

    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit("Pillow not installed. Run: pip install Pillow") from exc

    project_root = find_project_root(Path.cwd())
    tilemap = load_tilemap(project_root, args.tilemap_id, scene_id=args.scene_id)

    variants = tilemap.get("tile_variants") or []
    if not variants:
        raise SystemExit(f"Tilemap '{args.tilemap_id}' has no tile_variants")

    rows, cols = tilemap.get("sheet_grid", [4, 4])
    cells = rows * cols
    working_resolution = int(tilemap.get("working_resolution", 128))
    tile_w_in_game, tile_h_in_game = tilemap.get("tile_dimensions", [16, 16])

    # We composite at working_resolution for now; the in-game tile_dimensions
    # are recorded in the atlas meta for downstream tooling to downsize.
    cell_w = working_resolution
    cell_h = working_resolution
    sheet_w = cols * cell_w
    sheet_h = rows * cell_h

    if len(variants) > cells:
        print(
            f"  ⚠️  {args.tilemap_id}: {len(variants)} tile variants exceed sheet grid "
            f"{rows}x{cols}={cells} — extras will be dropped",
            file=sys.stderr,
        )
        variants = variants[:cells]

    if args.out_root:
        root = Path(args.out_root)
        if not root.is_absolute():
            root = project_root / root
        tiles_dir = root / "tiles"
        out_dir = root
    else:
        tiles_dir = project_root / "assets" / "tile_maps" / args.tilemap_id / "tiles"
        out_dir = project_root / "assets" / "tile_maps" / args.tilemap_id / "tilesheet"
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = out_dir / "tilesheet.png"
    atlas_path = out_dir / "tilesheet.atlas.json"
    prompt_path = out_dir / "tilesheet.prompt.txt"

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))

    frames = []
    debug_prompts = [f"# Tilesheet composite for {args.tilemap_id}\n"]
    placed = 0
    missing = []

    for i, variant in enumerate(variants):
        tile_id = variant["id"]
        tile_png = tiles_dir / tile_id / f"{tile_id}.png"
        row = i // cols
        col = i % cols
        x = col * cell_w
        y = row * cell_h

        if tile_png.exists():
            tile_img = Image.open(tile_png).convert("RGBA")
            if tile_img.size != (cell_w, cell_h):
                tile_img = tile_img.resize((cell_w, cell_h), Image.LANCZOS)
            sheet.paste(tile_img, (x, y), tile_img)
            placed += 1
        else:
            missing.append(tile_id)

        # Always emit an atlas entry so downstream tooling can find empty
        # cells too (rendered as transparent rectangles).
        frames.append({
            "filename": f"{tile_id}.png",
            "tile_id": tile_id,
            "layer": variant.get("layer", "base"),
            "frame": {"x": x, "y": y, "w": cell_w, "h": cell_h},
        })

        # Pull in the per-tile prompt for debugging if present.
        per_tile_prompt = tiles_dir / tile_id / f"{tile_id}.prompt.txt"
        if per_tile_prompt.exists():
            debug_prompts.append(
                f"\n--- {tile_id} ({variant.get('layer', 'base')}) ---\n"
                + per_tile_prompt.read_text(encoding="utf-8")
            )

    sheet.save(sheet_path, "PNG", optimize=True)
    prompt_path.write_text("\n".join(debug_prompts), encoding="utf-8")

    atlas = {
        "image": sheet_path.name,
        "meta": {
            "tilemap_id": args.tilemap_id,
            "rows": rows,
            "cols": cols,
            "frame_count": len(frames),
            "frame_size": {"w": cell_w, "h": cell_h},
            "sheet_size": {"w": sheet_w, "h": sheet_h},
            "in_game_tile_size": {"w": tile_w_in_game, "h": tile_h_in_game},
            "frame_order": "left-to-right, top-to-bottom",
        },
        "frames": frames,
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    print(
        f"[{args.tilemap_id}] composited {placed}/{len(variants)} tiles onto "
        f"{sheet_w}x{sheet_h} sheet ({rows}x{cols} grid of {cell_w}x{cell_h})",
        file=sys.stderr,
    )
    if missing:
        print(
            f"  ⚠️  {len(missing)} tile(s) missing — left transparent: {', '.join(missing)}",
            file=sys.stderr,
        )
    print(f"  wrote {sheet_path.relative_to(project_root)} + {atlas_path.name}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
