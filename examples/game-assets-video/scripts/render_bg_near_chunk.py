#!/usr/bin/env python3
"""render_bg_near_chunk.py — Rasterize one bg-near chunk's SVG into PNG.

Reads:
  - assets/scenes/{id}/bg-near/chunks/chunk-{NNN}/chunk.svg
  - assets/scenes/{id}/bg-near/chunks/chunk-{NNN}/chunk-spec.json   (canvas dims)

Writes:
  - assets/scenes/{id}/bg-near/chunks/chunk-{NNN}/chunk.skeleton.png

Deterministic, no API calls. cairosvg renders at exactly the spec's
canvas dims; if the rasterizer's output drifts (rare, sub-pixel), we
LANCZOS-resize to the exact target.

Usage:
  python scripts/render_bg_near_chunk.py <scene_id> <chunk_index>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cairosvg
from PIL import Image

from lib.sprite import find_project_root


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("chunk_index", type=int)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    # Bare chunk_index in the path (no zero-padding) so it matches the
    # framework's TASK.md output declarations after the YAML round-trip
    # collapses leading zeros.
    chunk_dir = (
        project_root / "assets" / "scenes" / args.scene_id / "bg-near" / "chunks"
        / f"chunk-{args.chunk_index}"
    )
    svg_path = chunk_dir / "chunk.svg"
    spec_path = chunk_dir / "chunk-spec.json"
    if not svg_path.exists():
        raise SystemExit(f"{svg_path} not found — run 02-svg first")
    if not spec_path.exists():
        raise SystemExit(f"{spec_path} not found — run 01-spec first")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    canvas = spec.get("canvas") or {}
    width = int(canvas["width_px"])
    height = int(canvas["height_px"])

    out_path = chunk_dir / "chunk.skeleton.png"
    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(out_path),
        output_width=width,
        output_height=height,
    )

    img = Image.open(out_path).convert("RGBA")
    if img.size != (width, height):
        img = img.resize((width, height), Image.LANCZOS)
        img.save(out_path, format="PNG")

    sys.stderr.write(
        f"  rendered {out_path.relative_to(project_root)} ({width}x{height})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
