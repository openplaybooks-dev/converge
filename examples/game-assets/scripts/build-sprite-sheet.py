#!/usr/bin/env python3
"""
build-sprite-sheet.py — Assemble individual sprite frames into a sprite sheet.

Usage:
  python scripts/build-sprite-sheet.py <frames_dir> <output_sheet.png>
    [--frames 8] [--sprite-resolution 128] [--sprites-per-row 4]

Input: directory containing frame PNGs (named frame_000.png, frame_001.png, etc.)
Output: sprite sheet PNG with frames arranged in a grid
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from lib.sprite import SpriteSheet, find_project_root


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("frames_dir", type=Path, help="Directory containing frame PNGs")
    ap.add_argument("output_sheet", type=Path, help="Output sprite sheet path")
    ap.add_argument("--frames", type=int, default=4, help="Total frame count")
    ap.add_argument("--sprite-resolution", type=int, default=128, help="Pixels per sprite")
    ap.add_argument("--sprites-per-row", type=int, default=4, help="Sprites per sheet row")
    args = ap.parse_args()

    if not args.frames_dir.exists():
        print(f"Error: frames directory not found: {args.frames_dir}", file=sys.stderr)
        return 1

    sheet = SpriteSheet.build(
        frames_dir=args.frames_dir,
        output_path=args.output_sheet,
        frame_count=args.frames,
        sprite_resolution=args.sprite_resolution,
        sprites_per_row=args.sprites_per_row,
    )

    print(f"wrote {args.output_sheet}")
    return 0


if __name__ == "__main__":
    sys.exit(main())