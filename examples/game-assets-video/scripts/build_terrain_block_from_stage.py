#!/usr/bin/env python3
"""Build a CONCEPT-RESOLUTION tilemap from stage.json.

Output: a STANDALONE file at `assets/scenes/<id>/terrain.json`.

The grid is at "concept resolution", not gameplay resolution. Convention:
the canvas is 10 concept tiles tall (one screen height); the concept
tile size is `canvas_height_px / 10`. Each concept tile covers a block
of `concept_tile_px / tile_size_px` gameplay tiles in each direction.
The adapter builds the fine gameplay grid first, then downsamples by
priority order so important features (water, platforms, hazards) survive
the merge even when they're a minority of cells in their block.

Why coarser: at API canvas dims (1536 × ~378) a 16-px gameplay grid of
244×60 lands at ~6 px per cell — too small for the model to read as a
tilemap. A 10-row concept grid maps to ~38 API px per cell, clearly
readable as outlined boxes.

Schema:

    {
      "scene_id":           "<id>",
      "tile_size_px":       <gameplay tile size, unchanged>,
      "concept_tile_px":    <px per concept tile = canvas_h / screen_height_units>,
      "screen_height_units": 10,
      "grid_size":          [width_concept_tiles, height_concept_tiles],
      "legend":             { ... },
      "rows":               [ "....", "####", ... ]  # exactly height_concept_tiles rows
    }

Procedure:
  1. Init grid with "." everywhere.
  2. Walk stage.elevation; for each x_tile column, fill "#" from the
     interpolated ground row down to the bottom.
  3. Walk stage.platforms; mark each platform's tile rectangle as "=".
  4. Walk stage.hazards; mark hazard tiles (kind=water) as "~", others as "^".

Usage:
  python scripts/build_terrain_block_from_stage.py <scene_id>
      [--platform-tiles-tall 1]
      [--hazard-tiles-tall 2]
      [--hazard-tiles-wide 3]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


CHAR_VAST     = "."
CHAR_LAND     = "#"
CHAR_WATER    = "~"
CHAR_PLATFORM = "="
CHAR_HAZARD   = "^"

# Priority order for the gameplay→concept downsample. A concept cell
# inherits the kind of any covered gameplay cell with HIGHER priority,
# regardless of count. Ensures sparse but important features (water,
# platforms, hazards) survive merging into coarser concept tiles.
PRIORITY = [CHAR_HAZARD, CHAR_WATER, CHAR_PLATFORM, CHAR_LAND, CHAR_VAST]


# Side-scrolling convention: one screen = N concept tiles tall.
# 10 is a typical "game screen height" for a side-scrolling platformer
# (large enough for full level structure, small enough for the painter
# to read each cell as an outlined box at API render dims).
DEFAULT_SCREEN_HEIGHT_UNITS = 10


LEGEND = {
    CHAR_VAST: {
        "kind": "vast",
        "color": None,
        "concept_hint": "leave as chroma green; nothing painted here (sky / behind-the-scene void)",
    },
    CHAR_LAND: {
        "kind": "land",
        "color": "#5B3B1C",
        "concept_hint": "paint as solid foreground earth — grass/foliage on top, dirt body below",
    },
    CHAR_WATER: {
        "kind": "water",
        "color": "#3A6FAA",
        "concept_hint": "paint as wetland / pond edge — reeds, lily pads, soft mud bank, no foliage on top",
    },
    CHAR_PLATFORM: {
        "kind": "platform",
        "color": "#7A6F5A",
        "concept_hint": "paint as a raised wood/grass-topped lip the player can land on; clean top edge",
    },
    CHAR_HAZARD: {
        "kind": "hazard",
        "color": "#A03A3A",
        "concept_hint": "paint as harsh thorny growth or jagged rock — hostile feature",
    },
}


def _interp_ground_y(samples: list[dict], x_tile: int) -> int:
    """Linear interpolation of y_tile across elevation samples."""
    samples = sorted(samples, key=lambda s: s["x_tile"])
    if x_tile <= samples[0]["x_tile"]:
        return samples[0]["y_tile"]
    if x_tile >= samples[-1]["x_tile"]:
        return samples[-1]["y_tile"]
    for a, b in zip(samples, samples[1:]):
        if a["x_tile"] <= x_tile <= b["x_tile"]:
            t = (x_tile - a["x_tile"]) / max(1, b["x_tile"] - a["x_tile"])
            return int(round(a["y_tile"] + (b["y_tile"] - a["y_tile"]) * t))
    return samples[-1]["y_tile"]


def build_grid(
    stage: dict,
    *,
    platform_tiles_tall: int,
    hazard_tiles_tall: int,
    hazard_tiles_wide: int,
) -> tuple[list[list[str]], int, int]:
    width_tiles = int(stage["world"]["width_tiles"])
    height_tiles = int(stage["world"]["height_tiles"])

    grid = [[CHAR_VAST] * width_tiles for _ in range(height_tiles)]

    # Step 2: ground polyline → fill land below the interpolated ground row.
    elev = stage.get("elevation") or []
    if elev:
        for x in range(width_tiles):
            y_ground = _interp_ground_y(elev, x)
            for y in range(y_ground, height_tiles):
                grid[y][x] = CHAR_LAND

    # Step 3: platforms → "=" cells at the platform's top row(s).
    for plat in stage.get("platforms", []) or []:
        xt = plat.get("x_tiles") or [0, 0]
        yt = int(plat.get("y_tile", 0))
        for x in range(max(0, xt[0]), min(width_tiles, xt[1])):
            for dy in range(platform_tiles_tall):
                y = yt + dy
                if 0 <= y < height_tiles:
                    grid[y][x] = CHAR_PLATFORM

    # Step 4: hazards → "~" or "^" centered on x_tile, at local ground level.
    for haz in stage.get("hazards", []) or []:
        kind = (haz.get("kind") or "").lower()
        ch = CHAR_WATER if kind == "water" else CHAR_HAZARD
        x_center = int(haz.get("x_tile", 0))
        x_lo = max(0, x_center - hazard_tiles_wide // 2)
        x_hi = min(width_tiles, x_lo + hazard_tiles_wide)
        # Anchor the hazard band at the local ground row (so water sits
        # AT the ground level, not floating in the sky).
        y_anchor = _interp_ground_y(elev, x_center) if elev else 0
        for x in range(x_lo, x_hi):
            for dy in range(hazard_tiles_tall):
                y = y_anchor + dy
                if 0 <= y < height_tiles:
                    grid[y][x] = ch

    return grid, width_tiles, height_tiles


def downsample_to_concept(
    fine_grid: list[list[str]],
    fine_w: int,
    fine_h: int,
    block_w: int,
    block_h: int,
) -> tuple[list[list[str]], int, int]:
    """Reduce a fine gameplay grid to a coarser concept grid by
    block_w x block_h merging using PRIORITY order — any covered cell
    of higher priority wins. Returns (concept_grid, concept_w, concept_h)."""
    concept_w = (fine_w + block_w - 1) // block_w
    concept_h = (fine_h + block_h - 1) // block_h
    out = [[CHAR_VAST] * concept_w for _ in range(concept_h)]
    rank = {ch: i for i, ch in enumerate(PRIORITY)}
    for cy in range(concept_h):
        for cx in range(concept_w):
            best = CHAR_VAST
            for fy in range(cy * block_h, min((cy + 1) * block_h, fine_h)):
                row = fine_grid[fy]
                for fx in range(cx * block_w, min((cx + 1) * block_w, fine_w)):
                    ch = row[fx]
                    if rank.get(ch, 999) < rank.get(best, 999):
                        best = ch
            out[cy][cx] = best
    return out, concept_w, concept_h


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("scene_id")
    ap.add_argument("--platform-tiles-tall", type=int, default=1)
    ap.add_argument("--hazard-tiles-tall", type=int, default=2)
    ap.add_argument("--hazard-tiles-wide", type=int, default=3)
    ap.add_argument("--screen-height-units", type=int, default=DEFAULT_SCREEN_HEIGHT_UNITS,
                    help="Concept tiles per screen height; sets coarse-grid scale.")
    ap.add_argument("--max-terrain-rows", type=int, default=None,
                    help="Force terrain content (land/water/platform/hazard) into the BOTTOM N concept rows; everything above becomes vast. Default = screen-height // 2.")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    stage_p = root / "assets" / "scenes" / args.scene_id / "stage.json"
    terrain_p = root / "assets" / "scenes" / args.scene_id / "terrain.json"
    spec_p = root / "assets" / "scenes" / args.scene_id / "bg-near" / "scene-spec.json"
    if not stage_p.exists():
        raise SystemExit(f"missing {stage_p}")

    stage = json.loads(stage_p.read_text(encoding="utf-8"))

    fine_grid, fine_w, fine_h = build_grid(
        stage,
        platform_tiles_tall=args.platform_tiles_tall,
        hazard_tiles_tall=args.hazard_tiles_tall,
        hazard_tiles_wide=args.hazard_tiles_wide,
    )

    # Compute concept tile size from canvas height: one screen = N tiles tall.
    canvas_h_px = int(stage["background"]["target_height_px"])
    canvas_w_px = int(stage["background"]["target_width_px"])
    tile_size_px = int(stage.get("tile_size_px", 16))
    screen_h_units = max(1, args.screen_height_units)
    concept_tile_px = max(tile_size_px, canvas_h_px // screen_h_units)
    # Round concept_tile_px to a multiple of tile_size_px so blocks are
    # whole gameplay tiles (avoids fractional-cell merging).
    concept_tile_px = (concept_tile_px // tile_size_px) * tile_size_px
    block = concept_tile_px // tile_size_px

    # Concept grid dims: width derived from gameplay/block ratio; height
    # from the screen-height convention.
    concept_w = (fine_w + block - 1) // block
    concept_h = screen_h_units

    # Cap terrain to the bottom N concept rows; everything above is vast.
    max_terrain_rows = args.max_terrain_rows
    if max_terrain_rows is None:
        max_terrain_rows = max(1, concept_h // 2)
    max_terrain_rows = max(1, min(max_terrain_rows, concept_h))
    vast_rows_on_top = concept_h - max_terrain_rows

    # Build the concept grid column-by-column from the elevation polyline,
    # mapping ground-top y variation across the available terrain rows so
    # undulation is VISIBLE (rather than collapsed by uniform-block
    # downsampling). For each concept column, the ground-top concept row
    # is computed from the local interpolated gameplay elevation, scaled
    # into the [0, max_terrain_rows-1] range.
    elev = sorted(stage.get("elevation") or [], key=lambda s: s["x_tile"])
    if elev:
        y_lo = min(s["y_tile"] for s in elev)
        y_hi = max(s["y_tile"] for s in elev)
    else:
        y_lo, y_hi = 14, 14
    elev_span = max(1, y_hi - y_lo)

    def _ground_y_at(x_tile: int) -> int:
        if not elev: return fine_h // 2
        if x_tile <= elev[0]["x_tile"]: return elev[0]["y_tile"]
        if x_tile >= elev[-1]["x_tile"]: return elev[-1]["y_tile"]
        for a, b in zip(elev, elev[1:]):
            if a["x_tile"] <= x_tile <= b["x_tile"]:
                t = (x_tile - a["x_tile"]) / max(1, b["x_tile"] - a["x_tile"])
                return int(round(a["y_tile"] + (b["y_tile"] - a["y_tile"]) * t))
        return elev[-1]["y_tile"]

    concept_grid: list[list[str]] = [[CHAR_VAST] * concept_w for _ in range(concept_h)]
    for cx in range(concept_w):
        gameplay_x = cx * block + block // 2  # column center
        gy = _ground_y_at(gameplay_x)
        # Map gameplay y into the available terrain rows (small at top of
        # screen → top of band; large → bottom of band). Clamp.
        norm = (gy - y_lo) / elev_span
        offset = int(round(norm * (max_terrain_rows - 1)))
        offset = max(0, min(max_terrain_rows - 1, offset))
        top_row = vast_rows_on_top + offset
        for cy in range(top_row, concept_h):
            concept_grid[cy][cx] = CHAR_LAND

    # Overlay platforms — carved into the vast region above the ground top
    # at the platform's elevation. Platforms are FLOATING ledges (so they
    # appear ABOVE local ground), not part of the ground band.
    for plat in stage.get("platforms", []) or []:
        xt = plat.get("x_tiles") or [0, 0]
        yt = int(plat.get("y_tile", 0))
        norm = (yt - y_lo) / elev_span
        plat_row = vast_rows_on_top + int(round(norm * (max_terrain_rows - 1)))
        plat_row = max(0, min(concept_h - 1, plat_row))
        cx_lo = max(0, xt[0] // block)
        cx_hi = min(concept_w, (xt[1] + block - 1) // block)
        for cx in range(cx_lo, cx_hi):
            concept_grid[plat_row][cx] = CHAR_PLATFORM

    # Overlay hazards — water hazards punch a hole through the land band
    # at the hazard's column, replacing land cells with water from the
    # ground-top row downward.
    for haz in stage.get("hazards", []) or []:
        kind = (haz.get("kind") or "").lower()
        ch = CHAR_WATER if kind == "water" else CHAR_HAZARD
        x_center = int(haz.get("x_tile", 0))
        x_lo = max(0, x_center - args.hazard_tiles_wide // 2)
        x_hi = min(fine_w, x_lo + args.hazard_tiles_wide)
        cx_lo = max(0, x_lo // block)
        cx_hi = min(concept_w, (x_hi + block - 1) // block)
        for cx in range(cx_lo, cx_hi):
            for cy in range(vast_rows_on_top, concept_h):
                if concept_grid[cy][cx] == CHAR_LAND:
                    concept_grid[cy][cx] = ch

    rows = ["".join(row) for row in concept_grid]

    terrain = {
        "scene_id": args.scene_id,
        "tile_size_px": tile_size_px,
        "concept_tile_px": concept_tile_px,
        "screen_height_units": screen_h_units,
        "grid_size": [concept_w, concept_h],
        "legend": LEGEND,
        "rows": rows,
    }
    terrain_p.write_text(json.dumps(terrain, indent=2), encoding="utf-8")

    # Clean up any old in-spec terrain block + legacy ground_polyline.
    if spec_p.exists():
        spec = json.loads(spec_p.read_text(encoding="utf-8"))
        changed = False
        if "terrain" in spec:
            del spec["terrain"]; changed = True
        if "ground_polyline" in spec:
            del spec["ground_polyline"]; changed = True
        if changed:
            spec_p.write_text(json.dumps(spec, indent=2), encoding="utf-8")

    counts: dict[str, int] = {c: 0 for c in LEGEND}
    for r in rows:
        for c in r:
            counts[c] = counts.get(c, 0) + 1
    total_cells = concept_w * concept_h
    print(f"  scene_id:        {args.scene_id}")
    print(f"  out:             {terrain_p.relative_to(root)}")
    print(f"  canvas (px):     {canvas_w_px}x{canvas_h_px}")
    print(f"  gameplay tile:   {tile_size_px} px  (fine grid {fine_w}x{fine_h})")
    print(f"  concept tile:    {concept_tile_px} px  ({block}x{block} gameplay tiles per concept tile)")
    print(f"  screen-height:   {screen_h_units} concept units")
    print(f"  concept grid:    {concept_w}x{concept_h} = {total_cells} cells")
    print(f"  terrain confined to bottom {max_terrain_rows} rows ({vast_rows_on_top} vast rows on top)")
    print(f"  cells by kind:")
    for c, n in counts.items():
        kind = LEGEND[c]["kind"]
        pct = round(100.0 * n / max(1, total_cells), 1)
        print(f"    '{c}' {kind:<10} {n:>6} cells ({pct}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
