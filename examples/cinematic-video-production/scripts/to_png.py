"""
Re-encode an image file as a valid PNG, in place.

Nano-banana (Gemini 2.5 Flash Image) often returns image/jpeg bytes even when
callers save the result to `.png`. Converge has a valid-png output validator
that rejects JPEG bytes in a .png file, stalling the convergence loop.

Usage:
  python scripts/to_png.py <path>

  <path>  an existing image file (any format Pillow reads). Overwritten with a
          valid PNG stream.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: to_png.py <path>", file=sys.stderr)
        return 2
    p = Path(sys.argv[1])
    if not p.exists():
        print(f"not found: {p}", file=sys.stderr)
        return 1
    img = Image.open(p)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    img.save(p, "PNG", optimize=True)
    print(f"normalized to PNG: {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
