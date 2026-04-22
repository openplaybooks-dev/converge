#!/usr/bin/env python3
"""
export_metadata.py — Generate atlas JSON + engine-specific formats.

Usage:
  python scripts/export_metadata.py <asset_dir> <category>
    [--engine godot] [--engine unity] [--engine raw]

Categories: characters, objects, backgrounds, tile_maps

Output:
  <asset_dir>/atlas.json           (engine-agnostic)
  <asset_dir>/atlas.godot.json     (Godot SpriteFrames)
  <asset_dir>/atlas.unity.json     (Unity SpriteAtlas)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib.sprite import AtlasExporter, find_project_root


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("asset_dir", type=Path, help="Asset directory (e.g. assets/characters/hero)")
    ap.add_argument("category", choices=["characters", "objects", "backgrounds", "tile_maps"])
    ap.add_argument("--engine", action="append", default=[], dest="engines",
                    help="Engines to export (godot, unity, raw). Can be repeated.")
    args = ap.parse_args()

    if not args.asset_dir.exists():
        print(f"Error: asset directory not found: {args.asset_dir}", file=sys.stderr)
        return 1

    # Default to all engines
    engines = args.engines if args.engines else ["godot", "unity", "raw"]

    exporter = AtlasExporter(asset_dir=args.asset_dir, category=args.category)
    exporter.export(engines=engines)

    for fmt in engines:
        out = args.asset_dir / f"atlas{f'.' + fmt if fmt != 'raw' else ''}.json"
        print(f"wrote {out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())