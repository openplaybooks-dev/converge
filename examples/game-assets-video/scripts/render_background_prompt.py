#!/usr/bin/env python3
"""render_background_prompt.py — fill the paint_over_skeleton template.

Reads `terrain.json` (which already contains the legend, the grid, the
block_instances list, and the rows) and produces a fully-rendered prompt
ready to feed to image-generate alongside `background.base.png`.

Sections produced:
  - {{kind_legend}}    — the legend bullet list
  - {{footprints}}     — the named feature list, sourced from block_instances
                          PLUS art_notes from each block's compiled JSON
  - {{palette}}        — palette block (project default + biome overrides)
  - {{canvas_width_px}}, {{canvas_height_px}}, {{anchor_width_pct}},
    {{grid_w}}, {{grid_h}}

Usage:
  python scripts/render_background_prompt.py <scene_id>
  python scripts/render_background_prompt.py <scene_id> --anchor-pct 7.6
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from blocks_compile import find_project_root


PALETTE_DEFAULT = """\
- ground_fill: #6FAA3E
- ground_stroke: #3A5C24
- foliage_fill: #2E5530
- foliage_stroke: #1A3A1C
- wood: #5B3B1C
- rock: #7A6F5A
- accent_flower: #E8C547
- chroma: #00FF00"""


TEMPLATE_PATH = Path(__file__).parent / "prompts" / "paint_over_skeleton.txt"


def render_kind_legend(legend: dict) -> str:
    lines: list[str] = []
    for ch, entry in legend.items():
        kind = entry.get("kind", "?")
        color = entry.get("color") or "(no fill — chroma stays)"
        hint = entry.get("concept_hint", "")
        lines.append(f"  - '{ch}' kind={kind:<10} color={color:<20} -> {hint}")
    return "\n".join(lines)


def render_footprints(terrain: dict, library: dict | None) -> str:
    """One line per block instance, with art_notes if available."""
    grid_w, grid_h = terrain["grid_size"]
    instances = terrain.get("block_instances") or []
    if not instances:
        return "  (no block instances — composer was not run with the new pipeline)"

    lines: list[str] = []
    for inst in instances:
        block_id = inst["block"]
        bx, by = inst["at"]
        bw, bh = inst["footprint"]
        x_lo, x_hi = bx, bx + bw - 1
        y_lo, y_hi = by, by + bh - 1
        x_lo_pct = round(100.0 * bx / grid_w, 1)
        x_hi_pct = round(100.0 * (bx + bw) / grid_w, 1)
        y_lo_pct = round(100.0 * by / grid_h, 1)
        y_hi_pct = round(100.0 * (by + bh) / grid_h, 1)

        art_notes = ""
        if library and block_id in library:
            art_notes = (library[block_id].get("art_notes") or "").strip()
            if art_notes:
                art_notes = " — " + art_notes.replace("\n", " ")

        lines.append(
            f"  - {block_id:<26} x_tile=[{x_lo}..{x_hi}]  y_tile=[{y_lo}..{y_hi}]  "
            f"(x={x_lo_pct}-{x_hi_pct}%  y={y_lo_pct}-{y_hi_pct}%){art_notes}"
        )
    return "\n".join(lines)


def render_prompt(
    terrain: dict,
    library: dict | None,
    *,
    anchor_pct: float,
    canvas_width_px: int,
    canvas_height_px: int,
) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    grid_w, grid_h = terrain["grid_size"]

    substitutions = {
        "{{canvas_width_px}}":   str(canvas_width_px),
        "{{canvas_height_px}}":  str(canvas_height_px),
        "{{anchor_width_pct}}":  f"{anchor_pct:.1f}",
        "{{grid_w}}":            str(grid_w),
        "{{grid_h}}":            str(grid_h),
        "{{kind_legend}}":       render_kind_legend(terrain.get("legend", {})),
        "{{footprints}}":        render_footprints(terrain, library),
        "{{palette}}":           PALETTE_DEFAULT,
    }
    out = template
    for key, val in substitutions.items():
        out = out.replace(key, val)
    return out


def load_library(project_root: Path, biome: str) -> dict[str, dict] | None:
    biome_dir = project_root / "blocks" / biome
    if not biome_dir.is_dir():
        return None
    out: dict[str, dict] = {}
    for js in biome_dir.glob("*.json"):
        if js.name == "index.json":
            continue
        data = json.loads(js.read_text(encoding="utf-8"))
        out[data["id"]] = data
    return out or None


def main() -> int:
    p = argparse.ArgumentParser(description="Render the paint-over-skeleton prompt for a scene")
    p.add_argument("scene_id")
    p.add_argument("--anchor-pct", type=float, default=7.6, help="anchor strip width as %% of canvas")
    p.add_argument("--out", help="output path (default: assets/scenes/<id>/background.prompt.txt)")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    terrain_path = scene_dir / "terrain.json"
    if not terrain_path.exists():
        print(f"error: {terrain_path} not found", file=sys.stderr)
        return 1
    terrain = json.loads(terrain_path.read_text(encoding="utf-8"))
    library = load_library(project_root, terrain.get("biome", "grassland"))

    grid_w, grid_h = terrain["grid_size"]
    tile_px = int(terrain.get("concept_tile_px", 80))
    canvas_width = grid_w * tile_px
    canvas_height = grid_h * tile_px

    prompt = render_prompt(
        terrain, library,
        anchor_pct=args.anchor_pct,
        canvas_width_px=canvas_width,
        canvas_height_px=canvas_height,
    )

    out = Path(args.out) if args.out else scene_dir / "background.prompt.txt"
    out.write_text(prompt, encoding="utf-8")
    print(f"wrote {out} ({len(prompt)} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
