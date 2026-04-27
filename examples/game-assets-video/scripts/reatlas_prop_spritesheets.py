#!/usr/bin/env python3
"""reatlas_prop_spritesheets.py — Rebuild prop atlases from existing PNGs.

Used after a fix to detect_grid_layout: re-runs the detector + alignment
+ atlas write for every existing prop spritesheet on disk, without
re-paying for image-gen. The PNG itself is also re-saved (alignment may
shift cells slightly).

Usage:
  python scripts/reatlas_prop_spritesheets.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from lib.keyframes import playback_for_state
from lib.sprite import align_frames_in_sheet, detect_grid_layout, find_project_root


# Same constants as generate_prop_spritesheet.py
COLS = 4
ROWS = 2


def main() -> int:
    project_root = find_project_root(Path.cwd())
    objects_file = project_root / "assets" / "objects.json"
    if not objects_file.exists():
        raise SystemExit(f"objects.json not found at {objects_file}")

    objects = json.loads(objects_file.read_text(encoding="utf-8"))
    by_id = {o["id"]: o for o in objects}

    rebuilt = 0
    skipped = 0
    for sheet in sorted((project_root / "assets" / "objects").rglob("*.png")):
        # Only sheet PNGs — skip frame siblings if any
        if "_qa" in sheet.stem:
            continue
        if "frames" in sheet.parts:
            continue
        atlas_path = sheet.with_suffix(".atlas.json")
        if not atlas_path.exists():
            skipped += 1
            continue

        # Recover obj_id, state, category from path
        # path: assets/objects/{obj_id}/spritesheets/{state}/{state}.png
        parts = sheet.relative_to(project_root / "assets" / "objects").parts
        if len(parts) < 4 or parts[1] != "spritesheets":
            skipped += 1
            continue
        obj_id = parts[0]
        state = parts[2]
        obj = by_id.get(obj_id, {})
        category = obj.get("category") or obj.get("type") or "item"

        img_bytes = sheet.read_bytes()
        layout = detect_grid_layout(img_bytes, expected_cols=COLS, expected_rows=ROWS)
        actual_cols = layout["cols"]
        actual_rows = layout["rows"]
        actual_n = actual_cols * actual_rows

        # Re-align with the chosen layout
        aligned_bytes, anchors = align_frames_in_sheet(img_bytes, actual_cols, actual_rows)
        sheet.write_bytes(aligned_bytes)

        playback = playback_for_state(state)

        # Preserve seed from existing atlas if present
        prev_atlas = json.loads(atlas_path.read_text(encoding="utf-8"))
        seed_used = prev_atlas.get("meta", {}).get("seed", 0)

        atlas = {
            "image": sheet.name,
            "meta": {
                "obj_id": obj_id,
                "state": state,
                "category": category,
                "rows": actual_rows,
                "cols": actual_cols,
                "frame_count": actual_n,
                "frame_size": layout["frame_size"],
                "sheet_size": layout["sheet_size"],
                "frame_order": "left-to-right, top-to-bottom",
                "requested_cols": COLS,
                "requested_rows": ROWS,
                "detected": layout["detected"],
                "aligned": True,
                "frameRate": playback["frameRate"],
                "yoyo": playback["yoyo"],
                "seed": seed_used,
            },
            "frames": [
                {
                    "filename": f"{state}_{i:03d}.png",
                    "frame": f["frame"],
                    "anchor": anchors[i] if i < len(anchors) else None,
                }
                for i, f in enumerate(layout["frames"])
            ],
        }
        atlas_path.write_text(json.dumps(atlas, indent=2), encoding="utf-8")
        marker = "OK" if (actual_rows, actual_cols) == (ROWS, COLS) else f"⚠ {actual_rows}×{actual_cols}"
        print(f"  {obj_id}/{state}: {marker} ({actual_n} frames, detected={layout['detected']})", file=sys.stderr)
        rebuilt += 1

    print(f"\nRebuilt {rebuilt} atlases ({skipped} skipped)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
