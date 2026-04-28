#!/usr/bin/env python3
"""generate_tilesheet_v2.py — Single image-gen call for the whole tilesheet.

Replaces the per-tile pipeline (`generate_tile.py` + `build_tilesheet.py`)
with one call drawing the entire tile grid on a single canvas. The model
naturally produces matching edges between adjacent cells when it sees them
together — same property that already gives consistent prop frames in
`generate_prop_spritesheet.py`.

Reads:
  - assets/scenes/{scene_id}/scene-plan.json[tilesheet]
  - assets/concept/style-sheet.png        (universal anchor)
  - assets/scenes/{scene_id}/concept.png  (scene anchor)

Writes:
  - assets/scenes/{scene_id}/tilesheet/tilesheet.png
  - assets/scenes/{scene_id}/tilesheet/tilesheet.atlas.json
  - assets/scenes/{scene_id}/tilesheet/tilesheet.prompt.txt
  - assets/scenes/{scene_id}/tilesheet/tilesheet.seed.txt

Usage:
  python scripts/generate_tilesheet_v2.py <scene_id> [--seed N]
"""

from __future__ import annotations

import argparse
import io
import json
import sys
from pathlib import Path

from PIL import Image

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root
from lib.style_anchor import attach_style_anchor


# Native-resolvable canvas. Tile cells are derived from the grid.
SHEET_W = 1024
SHEET_H = 1024
API_ASPECT = "1:1"


def load_scene_plan(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes" / scene_id / "scene-plan.json"
    if not p.exists():
        raise SystemExit(
            f"{p} not found — run scene/02-decompose first"
        )
    return json.loads(p.read_text(encoding="utf-8"))


def find_green_template(project_root: Path) -> Path:
    """Reuse the prop pipeline's green template — same shape works for
    a square sheet."""
    templates_dir = project_root / ".templates"
    if not templates_dir.exists():
        raise SystemExit(
            f"No .templates/ directory at {templates_dir}. "
            f"Run scripts/create_green_template.py first."
        )
    candidates = sorted(templates_dir.glob("green_*.png"))
    if not candidates:
        raise SystemExit(f"No green_*.png templates in {templates_dir}")
    return candidates[-1]  # largest; the model upscales as needed


def build_prompt(plan_tilesheet: dict, scene_id: str) -> str:
    grid = plan_tilesheet.get("grid") or [4, 4]
    rows, cols = grid
    tile_size = plan_tilesheet.get("tile_size_px", 128)
    palette = plan_tilesheet.get("shared_palette", "consistent across all tiles")
    tiles = plan_tilesheet.get("tiles") or []

    # Order tiles by (row, col) so the prompt matches the on-canvas layout.
    sorted_tiles = sorted(
        tiles,
        key=lambda t: (
            (t.get("cell") or [99, 99])[0],
            (t.get("cell") or [99, 99])[1],
        ),
    )

    cell_lines: list[str] = []
    for t in sorted_tiles:
        cell = t.get("cell") or [0, 0]
        nbrs = t.get("neighbors") or {}
        cell_lines.append(
            f"  - cell [row={cell[0]}, col={cell[1]}] {t.get('id', '?')}: "
            f"{t.get('description', '')} "
            f"[edges: {t.get('edges', '')}; "
            f"neighbors: top={nbrs.get('top','?')} bottom={nbrs.get('bottom','?')} "
            f"left={nbrs.get('left','?')} right={nbrs.get('right','?')}]"
        )
    cells_block = "\n".join(cell_lines) or "  - (no tiles declared)"

    return f"""ONE square tilesheet for a 2D game scene `{scene_id}`. Single image, drawn as a {rows}×{cols} grid.
Each cell is one terrain tile. The tiles share ONE palette and ONE rendering style — same brush, same line weight, same shading model.

Grid: {rows} rows × {cols} cols. In-game tile size: {tile_size}×{tile_size} px.
Shared palette: {palette}

Tiles (in row-major order, top-left first):
{cells_block}

CRITICAL TILEABILITY RULES:
- Each tile is drawn edge-to-edge inside its cell — no margins, no border.
- Tiles in the same row that abut each other MUST have matching content at their shared edge:
  the right edge of cell [r, c] must visually connect to the left edge of cell [r, c+1].
- Vertical adjacency follows the same rule for top↔bottom edges.
- Tiles meant to be standalone (mushroom, flower, decoration) sit centered on their base
  terrain (e.g., grass) so they tile cleanly even when placed in any base cell context.
- Use the supplied style-sheet anchor + scene concept image as the rendering style — match
  line weight, palette, and shading exactly. Do NOT vary style between cells.

DO NOT:
- Do not draw frame numbers, labels, captions, watermarks, grid lines, or annotations.
- Do not invent additional tiles outside the {rows*cols} cells specified.
- Do not vary the rendering style between cells — the whole sheet is one rendering job.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    plan = load_scene_plan(project_root, args.scene_id)
    plan_tilesheet = plan.get("tilesheet") or {}
    if not plan_tilesheet.get("tiles"):
        sys.stderr.write(
            f"  no tiles declared in scene-plan for {args.scene_id} — skipping\n"
        )
        return 0

    grid = plan_tilesheet.get("grid") or [4, 4]
    rows, cols = grid

    out_dir = project_root / "assets" / "scenes" / args.scene_id / "tilesheet"
    out_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = out_dir / "tilesheet.png"
    atlas_path = out_dir / "tilesheet.atlas.json"
    prompt_path = out_dir / "tilesheet.prompt.txt"
    seed_path = out_dir / "tilesheet.seed.txt"

    base_ref = find_green_template(project_root)
    extra_refs = attach_style_anchor([], project_root, scene_id=args.scene_id)

    prompt = build_prompt(plan_tilesheet, args.scene_id)
    backend = active_backend()
    cost = budget.cost_for_image(backend)

    sys.stderr.write(
        f"[tilesheet {args.scene_id}] {rows}x{cols} grid, "
        f"backend={backend} cost={cost}c\n"
    )

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"{args.scene_id}/tilesheet",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            base_ref,
            extra_refs,
            seed=args.seed,
            aspect_ratio=API_ASPECT,
            resolution=(SHEET_W, SHEET_H),
        )

    img = Image.open(io.BytesIO(img_bytes))
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.save(sheet_path, format="PNG")
    prompt_path.write_text(prompt, encoding="utf-8")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    cell_w = img.size[0] // cols
    cell_h = img.size[1] // rows
    frames = []
    sorted_tiles = sorted(
        plan_tilesheet.get("tiles") or [],
        key=lambda t: ((t.get("cell") or [99, 99])[0], (t.get("cell") or [99, 99])[1]),
    )
    for idx, t in enumerate(sorted_tiles):
        cell = t.get("cell") or [idx // cols, idx % cols]
        r, c = cell
        frames.append(
            {
                "filename": f"{t.get('id','tile')}.png",
                "frame": {
                    "x": c * cell_w,
                    "y": r * cell_h,
                    "w": cell_w,
                    "h": cell_h,
                },
                "tile_id": t.get("id"),
            }
        )

    atlas = {
        "image": sheet_path.name,
        "meta": {
            "scene_id": args.scene_id,
            "rows": rows,
            "cols": cols,
            "frame_count": len(frames),
            "frame_size": {"w": cell_w, "h": cell_h},
            "sheet_size": {"w": img.size[0], "h": img.size[1]},
            "in_game_tile_size": {
                "w": plan_tilesheet.get("tile_size_px", 16),
                "h": plan_tilesheet.get("tile_size_px", 16),
            },
            "frame_order": "row-major, top-left first",
            "seed": seed_used,
        },
        "frames": frames,
    }
    atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")

    sys.stderr.write(
        f"  wrote {sheet_path.relative_to(project_root)} "
        f"({rows}x{cols}, {len(frames)} tiles, seed={seed_used})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
