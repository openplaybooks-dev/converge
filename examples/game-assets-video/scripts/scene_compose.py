#!/usr/bin/env python3
"""scene_compose.py — stamp block instances onto a scene grid → terrain.json.

Reads `assets/scenes/{scene_id}/scene.composition.json` and the biome's
compiled block library, stamps each block at its declared (x_tile, y_tile),
validates connection rules, and writes `terrain.json` (the unified grid +
tilesheet spec + canvas metadata + beats).

scene.composition.json shape:

    {
      "scene_id": "forest-tutorial",
      "biome": "grassland",
      "canvas": {
        "tile_size_px": 16,
        "concept_tile_px": 80,
        "grid_size": [120, 12]
      },
      "blocks": [
        { "block": "spawn-marker", "at": [0, 11] },
        { "block": "grass-flat-5w", "at": [0, 11] },
        ...
      ]
    }

Coordinates: `at` is the block's TOP-LEFT cell in (x_tile, y_tile).
The composer rejects: out-of-bounds blocks, overlapping blocks (two blocks
writing the same cell with non-passthrough content), and connection-rule
violations.

Usage:
  python scripts/scene_compose.py <scene_id>
  python scripts/scene_compose.py <scene_id> --check    # validate, no write
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from blocks_compile import DEFAULT_LEGEND, find_project_root


PASSTHROUGH_TILE: str | None = None
PASSTHROUGH_KIND: str = "vast"


# ---------------------------------------------------------------------------
# Block library loading

def load_block_library(project_root: Path, biome: str) -> dict[str, dict[str, Any]]:
    biome_dir = project_root / "blocks" / biome
    if not biome_dir.is_dir():
        raise FileNotFoundError(f"biome '{biome}' not found at {biome_dir}")
    blocks: dict[str, dict[str, Any]] = {}
    for js in sorted(biome_dir.glob("*.json")):
        if js.name == "index.json":
            continue
        data = json.loads(js.read_text(encoding="utf-8"))
        blocks[data["id"]] = data
    if not blocks:
        raise RuntimeError(
            f"no compiled blocks in {biome_dir} — run scripts/blocks_compile.py first"
        )
    return blocks


# ---------------------------------------------------------------------------
# Stamping

@dataclass
class StampedScene:
    grid_w: int
    grid_h: int
    tile_grid: list[list[str | None]]   # tile id per cell, None = passthrough
    kind_grid: list[list[str]]          # legend kind per cell
    block_instances: list[dict[str, Any]]   # for the scene manifest
    beats: list[dict[str, Any]]


def stamp_scene(composition: dict[str, Any], library: dict[str, dict[str, Any]]) -> StampedScene:
    canvas = composition["canvas"]
    grid_w, grid_h = canvas["grid_size"]
    if grid_w <= 0 or grid_h <= 0:
        raise ValueError(f"canvas.grid_size must be positive, got {grid_w}x{grid_h}")

    tile_grid: list[list[str | None]] = [
        [PASSTHROUGH_TILE for _ in range(grid_w)] for _ in range(grid_h)
    ]
    kind_grid: list[list[str]] = [
        [PASSTHROUGH_KIND for _ in range(grid_w)] for _ in range(grid_h)
    ]

    instances: list[dict[str, Any]] = []
    beats: list[dict[str, Any]] = []
    occupancy: dict[tuple[int, int], str] = {}   # cell → block instance index that "owns" it

    for inst_idx, instance in enumerate(composition["blocks"]):
        block_id = instance["block"]
        at = instance["at"]
        if block_id not in library:
            raise ValueError(
                f"block '{block_id}' not in library "
                f"(available: {sorted(library.keys())[:8]}…)"
            )
        block = library[block_id]
        bx, by = int(at[0]), int(at[1])
        bw, bh = block["footprint"]

        if bx < 0 or by < 0 or bx + bw > grid_w or by + bh > grid_h:
            raise ValueError(
                f"block '{block_id}' at ({bx},{by}) size {bw}x{bh} extends outside "
                f"grid {grid_w}x{grid_h}"
            )

        block_tiles = block["tile_map"]
        block_kinds = block["skeleton_kinds"]

        for ly in range(bh):
            for lx in range(bw):
                gx, gy = bx + lx, by + ly
                tile = block_tiles[ly][lx]
                kind = block_kinds[ly][lx]

                # Passthrough cells (sky/decor) yield to anything else; non-
                # passthrough cells claim ownership and refuse overwrites.
                cell_key = (gx, gy)
                existing_owner = occupancy.get(cell_key)
                cell_is_content = tile is not None or kind not in ("vast", "decor")

                if existing_owner is not None and cell_is_content:
                    existing_block = composition["blocks"][int(existing_owner)]["block"]
                    raise ValueError(
                        f"block '{block_id}' at ({bx},{by}) overlaps "
                        f"block '{existing_block}' at cell ({gx},{gy})"
                    )

                if tile is not None:
                    tile_grid[gy][gx] = tile
                # Skeleton: prefer non-vast over vast; decor sits on top of
                # vast but underneath any concrete kind.
                current_kind = kind_grid[gy][gx]
                if _kind_priority(kind) > _kind_priority(current_kind):
                    kind_grid[gy][gx] = kind

                if cell_is_content:
                    occupancy[cell_key] = str(inst_idx)

        # Record block instance
        instances.append({
            "block": block_id,
            "at": [bx, by],
            "footprint": [bw, bh],
            "category": block["category"],
        })
        for beat_label in block["gameplay"].get("beats", []):
            beats.append({
                "x_tile": bx,
                "y_tile": by + bh - 1,    # anchor at the block's bottom row
                "kind": beat_label,
                "block": block_id,
            })

    return StampedScene(
        grid_w=grid_w,
        grid_h=grid_h,
        tile_grid=tile_grid,
        kind_grid=kind_grid,
        block_instances=instances,
        beats=beats,
    )


def _kind_priority(kind: str) -> int:
    """Higher = more concrete. Used when two blocks paint the same cell."""
    return {
        "vast": 0,
        "decor": 1,
        "land": 2,
        "water": 2,
        "platform": 3,
        "hazard": 3,
    }.get(kind, 1)


# ---------------------------------------------------------------------------
# Connection rules

def validate_connection_rules(
    composition: dict[str, Any],
    library: dict[str, dict[str, Any]],
    scene: StampedScene,
) -> list[str]:
    """Return a list of human-readable violation messages (empty if all valid)."""
    errors: list[str] = []
    for instance in composition["blocks"]:
        block = library[instance["block"]]
        bx, by = instance["at"]
        bw, bh = block["footprint"]
        rules = block["connection_rules"]

        for side, allowed in rules.items():
            if allowed == "world-floor":
                if side != "bottom":
                    errors.append(
                        f"{block['id']} at ({bx},{by}): rule '{side}: world-floor' "
                        f"only valid on bottom side"
                    )
                    continue
                if by + bh != scene.grid_h:
                    errors.append(
                        f"{block['id']} at ({bx},{by}): bottom: world-floor but block "
                        f"bottom row is y={by + bh - 1}, world floor is y={scene.grid_h - 1}"
                    )
                continue

            allowed_set = set(allowed)
            neighbor_kinds = _neighbor_kinds(scene, bx, by, bw, bh, side)
            # The rule passes if AT LEAST ONE neighbor cell on this side
            # matches an allowed kind. Rationale: a 2-tall pond's left
            # side is part-`land` (bottom row) and part-`vast` (top row);
            # the "needs land" rule means the pond has a shore *somewhere*
            # alongside, not that every cell of the side is land.
            if not any(k in allowed_set for k in neighbor_kinds):
                errors.append(
                    f"{block['id']} at ({bx},{by}): {side} side has no "
                    f"matching neighbor kind (saw {sorted(set(neighbor_kinds))}, "
                    f"need any of {sorted(allowed_set)})"
                )
    return errors


def _neighbor_kinds(
    scene: StampedScene, bx: int, by: int, bw: int, bh: int, side: str
) -> list[str]:
    """Return the kinds of all cells immediately on the given side of the block."""
    kinds: list[str] = []
    if side == "left":
        x = bx - 1
        if x < 0:
            return ["vast"]   # off-grid is treated as sky/vast
        for y in range(by, by + bh):
            kinds.append(scene.kind_grid[y][x])
    elif side == "right":
        x = bx + bw
        if x >= scene.grid_w:
            return ["vast"]
        for y in range(by, by + bh):
            kinds.append(scene.kind_grid[y][x])
    elif side == "top":
        y = by - 1
        if y < 0:
            return ["vast"]
        for x in range(bx, bx + bw):
            kinds.append(scene.kind_grid[y][x])
    elif side == "bottom":
        y = by + bh
        if y >= scene.grid_h:
            return ["vast"]
        for x in range(bx, bx + bw):
            kinds.append(scene.kind_grid[y][x])
    return kinds


# ---------------------------------------------------------------------------
# terrain.json emit

def build_terrain_json(
    composition: dict[str, Any],
    scene: StampedScene,
) -> dict[str, Any]:
    """Render the stamped scene as a terrain.json.

    Backward-compatible with the existing schema: rows of single-char
    legend codes + legend dict + grid_size + tile sizes. The painter and
    skeleton renderer both consume this directly.
    """
    canvas = composition["canvas"]
    legend_entries = {ch: dict(meta) for ch, meta in DEFAULT_LEGEND.items()}
    kind_to_char = {meta["kind"]: ch for ch, meta in DEFAULT_LEGEND.items()}

    rows: list[str] = []
    for y in range(scene.grid_h):
        chars: list[str] = []
        for x in range(scene.grid_w):
            kind = scene.kind_grid[y][x]
            chars.append(kind_to_char.get(kind, "."))
        rows.append("".join(chars))

    return {
        "scene_id": composition["scene_id"],
        "biome": composition["biome"],
        "tile_size_px": canvas["tile_size_px"],
        "concept_tile_px": canvas["concept_tile_px"],
        "grid_size": [scene.grid_w, scene.grid_h],
        "legend": legend_entries,
        "rows": rows,
        "tile_grid": scene.tile_grid,           # the resolved tilemap
        "block_instances": scene.block_instances,
        "beats": scene.beats,
    }


# ---------------------------------------------------------------------------
# CLI

def main() -> int:
    p = argparse.ArgumentParser(description="Compose a scene from blocks → terrain.json")
    p.add_argument("scene_id", help="scene id (folder under assets/scenes/)")
    p.add_argument("--check", action="store_true", help="validate, do not write terrain.json")
    p.add_argument("--force", action="store_true", help="overwrite existing terrain.json")
    p.add_argument("--out", help="output path (default: assets/scenes/<id>/terrain.json)")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    composition_path = scene_dir / "scene.composition.json"
    if not composition_path.exists():
        print(f"error: {composition_path} not found", file=sys.stderr)
        return 1

    composition = json.loads(composition_path.read_text(encoding="utf-8"))
    biome = composition["biome"]
    library = load_block_library(project_root, biome)
    print(f"loaded {len(library)} {biome} blocks")

    scene = stamp_scene(composition, library)
    print(f"stamped {len(scene.block_instances)} block instances onto {scene.grid_w}x{scene.grid_h} grid")

    errors = validate_connection_rules(composition, library, scene)
    if errors:
        print(f"\nconnection-rule violations ({len(errors)}):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    terrain = build_terrain_json(composition, scene)
    if args.check:
        print("OK (check only — no write)")
        return 0

    out = Path(args.out) if args.out else scene_dir / "terrain.json"
    if out.exists() and not args.force:
        print(
            f"error: {out} already exists. Pass --force to overwrite, "
            f"or --out PATH to write elsewhere.",
            file=sys.stderr,
        )
        return 3
    out.write_text(json.dumps(terrain, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
