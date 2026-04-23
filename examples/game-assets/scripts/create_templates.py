#!/usr/bin/env python3
"""
create_templates.py — Generate blank sprite sheet template images.

Usage:
  python scripts/create_templates.py [--cols 4] [--rows 4] [--resolution 128] [--output assets/global/templates]

Creates blank PNG templates showing grid layout for AI sprite sheet generation.
Templates have subtle grid lines to indicate cell boundaries.
"""

from __future__ import annotations

import argparse
from pathlib import Path


def create_template(cols: int, rows: int, resolution: int, output_path: Path) -> None:
    try:
        from PIL import Image, ImageDraw
    except ImportError as exc:
        raise SystemExit("Pillow not installed. Run: pip install Pillow") from exc

    sheet_w = cols * resolution
    sheet_h = rows * resolution

    # GREEN SCREEN background
    img = Image.new("RGBA", (sheet_w, sheet_h), (0, 255, 0, 255))
    draw = ImageDraw.Draw(img)

    # Draw BLACK grid lines
    line_color = (0, 0, 0, 255)
    line_width = 2

    # Draw outer border
    draw.rectangle([0, 0, sheet_w - 1, sheet_h - 1], outline=line_color, width=line_width)

    # Vertical lines between columns
    for col in range(1, cols):
        x = col * resolution
        draw.line([(x, 0), (x, sheet_h)], fill=line_color, width=line_width)

    # Horizontal lines between rows
    for row in range(1, rows):
        y = row * resolution
        draw.line([(0, y), (sheet_w, y)], fill=line_color, width=line_width)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, "PNG", optimize=True)
    print(f"created {output_path} (green screen bg, black grid)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--cols", type=int, default=4, help="Number of columns. Default: 4")
    ap.add_argument("--rows", type=int, default=4, help="Number of rows. Default: 4")
    ap.add_argument("--resolution", type=int, default=128, help="Sprite resolution per cell. Default: 128")
    ap.add_argument("--output", type=Path, default=None, help="Output path")
    args = ap.parse_args()

    if args.output:
        output_path = args.output
    else:
        project_root = Path(__file__).parent.parent
        output_path = project_root / "assets" / "global" / "templates" / f"{args.cols}x{args.rows}.png"

    create_template(args.cols, args.rows, args.resolution, output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())