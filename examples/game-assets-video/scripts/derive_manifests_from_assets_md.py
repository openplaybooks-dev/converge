#!/usr/bin/env python3
"""derive_manifests_from_assets_md.py — Parse ASSETS.md and emit the JSON manifests.

Reads ASSETS.md (produced by generate_assets_md.py from the visual-target
screenshot) and emits the JSON manifests the rest of the pipeline already
consumes:
  - assets/sprites.json     — characters
  - assets/objects.json     — props
  - assets/backgrounds.json — backgrounds
  - assets/tile_maps.json   — tile maps

Sizes from the table populate `working_resolution` / `resolution` / tile
size fields automatically.

Skip behavior: if ASSETS.md doesn't exist, this script is a no-op (returns 0)
so the playbook can run with hand-authored manifests too.

Usage:
  python scripts/derive_manifests_from_assets_md.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from lib.sprite import find_project_root


def _parse_size_pixels(size_str: str) -> tuple[int, int] | None:
    """'128x128 px' → (128, 128); '1920x1080' → (1920, 1080); '2m tile' → None."""
    m = re.search(r"(\d+)\s*[xX×]\s*(\d+)", size_str)
    if not m:
        return None
    return (int(m.group(1)), int(m.group(2)))


def _parse_animation_states(cell: str) -> list[str]:
    raw = cell.strip().strip("[]")
    if not raw:
        return ["idle"]
    return [s.strip() for s in raw.split(",") if s.strip()]


def _parse_table(section_lines: list[str]) -> list[dict]:
    """Parse a markdown table. First non-empty line = header. Returns list of
    dicts keyed by header cell (lowercased)."""
    rows: list[dict] = []
    header: list[str] | None = None
    for line in section_lines:
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if header is None:
            header = [c.lower() for c in cells]
            continue
        if all(set(c) <= {"-", ":"} for c in cells):  # separator row
            continue
        rows.append(dict(zip(header, cells)))
    return rows


def _split_sections(md: str) -> dict[str, list[str]]:
    """Section text keyed by '## Heading' (lowercased, stripped)."""
    out: dict[str, list[str]] = {}
    current: str | None = None
    for line in md.splitlines():
        if line.startswith("## "):
            current = line[3:].strip().lower()
            out[current] = []
        elif current is not None:
            out[current].append(line)
    return out


def _to_sprites_json(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        size = _parse_size_pixels(r.get("size", ""))
        working = size[0] if size else 128
        out.append({
            "id": r.get("id") or r.get("name", ""),
            "name": (r.get("description", "") or r.get("id", "")).split(",")[0].strip().title(),
            "description": r.get("description", ""),
            "animation_states": _parse_animation_states(r.get("animation states", "idle")),
            "canonical_angle": "side_right",
            "working_resolution": working,
            "source_resolution": max(working * 2, 512),
        })
    return out


def _to_objects_json(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        size = _parse_size_pixels(r.get("size", ""))
        working = size[0] if size else 64
        out.append({
            "id": r.get("id") or r.get("name", ""),
            "name": r.get("description", "").split(",")[0].strip().title() or r.get("id", ""),
            "description": r.get("description", ""),
            "animation_states": _parse_animation_states(r.get("animation states", "idle")),
            "category": "item",
            "working_resolution": working,
        })
    return out


def _to_backgrounds_json(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        size = _parse_size_pixels(r.get("size", ""))
        out.append({
            "id": r.get("id") or r.get("name", ""),
            "name": r.get("description", "").split(",")[0].strip().title() or r.get("id", ""),
            "description": r.get("description", ""),
            "resolution": list(size) if size else [1920, 1080],
            "parallax_layer": "mid",
        })
    return out


def _to_tile_maps_json(rows: list[dict]) -> list[dict]:
    out = []
    for r in rows:
        size = _parse_size_pixels(r.get("tile size", "") or r.get("size", ""))
        tile_w = size[0] if size else 32
        out.append({
            "id": r.get("id") or r.get("name", ""),
            "name": r.get("description", "").split(",")[0].strip().title() or r.get("id", ""),
            "description": r.get("description", ""),
            "tile_size": tile_w,
            "tiles": [],
        })
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--force", action="store_true",
        help="Overwrite existing manifests. Default: refuse if a target file already exists.",
    )
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    md_path = project_root / "ASSETS.md"
    if not md_path.exists():
        print("ASSETS.md not found — skipping (manifests must already exist).", file=sys.stderr)
        return 0

    md = md_path.read_text(encoding="utf-8")
    sections = _split_sections(md)

    mappings = [
        ("characters", "sprites.json", _to_sprites_json),
        ("props", "objects.json", _to_objects_json),
        ("backgrounds", "backgrounds.json", _to_backgrounds_json),
        ("tile maps", "tile_maps.json", _to_tile_maps_json),
    ]

    written: list[str] = []
    skipped: list[str] = []
    for heading, filename, converter in mappings:
        lines = sections.get(heading)
        if lines is None:
            continue
        rows = _parse_table(lines)
        if not rows:
            continue
        records = converter(rows)
        if not records:
            continue
        out_path = project_root / "assets" / filename
        if out_path.exists() and not args.force:
            skipped.append(filename)
            continue
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(records, indent=2), encoding="utf-8")
        written.append(f"{filename} ({len(records)} rows)")

    if written:
        print("[planner] derived: " + ", ".join(written), file=sys.stderr)
    if skipped:
        print(
            f"[planner] skipped (already exist): {', '.join(skipped)} "
            "— pass --force to overwrite",
            file=sys.stderr,
        )
    if not written and not skipped:
        print("[planner] no tables parsed from ASSETS.md", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
