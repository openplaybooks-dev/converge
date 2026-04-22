#!/usr/bin/env python3
"""
slice-sprites.py — Slice a sprite sheet into individual frame PNGs.

Usage:
  python scripts/slice-sprites.py <sprite_sheet.png> <output_dir>
    [--sprite-resolution 128] [--sprites-per-row 4]

Input: sprite sheet PNG
Output: individual frame PNGs in output_dir/
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from lib.sprite import SpriteSheet, find_project_root


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("sprite_sheet", type=Path, help="Sprite sheet PNG")
    ap.add_argument("output_dir", type=Path, help="Output directory for frames")
    ap.add_argument("--sprite-resolution", type=int, default=128, help="Pixels per sprite")
    ap.add_argument("--sprites-per-row", type=int, default=4, help="Sprites per sheet row")
    ap.add_argument("--prefix", default="frame", help="Filename prefix (default: frame)")
    ap.add_argument("--json", type=Path, default=None, help="Write frames.json with coords")
    args = ap.parse_args()

    if not args.sprite_sheet.exists():
        print(f"Error: sprite sheet not found: {args.sprite_sheet}", file=sys.stderr)
        return 1

    frames = SpriteSheet.slice(
        sprite_sheet=args.sprite_sheet,
        output_dir=args.output_dir,
        sprite_resolution=args.sprite_resolution,
        sprites_per_row=args.sprites_per_row,
        prefix=args.prefix,
    )

    print(f"sliced {len(frames)} frames to {args.output_dir}")

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(frames, indent=2), encoding="utf-8")
        print(f"wrote {args.json}")

    return 0


if __name__ == "__main__":
    sys.exit(main())