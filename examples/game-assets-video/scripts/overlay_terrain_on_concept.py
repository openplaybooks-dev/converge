#!/usr/bin/env python3
"""overlay_terrain_on_concept.py — cross-check tool.

Project the terrain.json grid back onto the generated concept.png as a
colored grid overlay so the user can visually verify whether the painted
output respects the schematic intent (water in the right places, ground
horizon at the right rows, platforms where they should be, etc.).

Inputs:
  - assets/scenes/<id>/bg-near/concept.png  (AI-painted output)
  - assets/scenes/<id>/terrain.json         (tilemap grid + legend)

Outputs:
  - assets/scenes/<id>/bg-near/concept.overlay.png  (concept + grid overlay)

Usage:
  python scripts/overlay_terrain_on_concept.py <scene_id>
                                               [--alpha 110]
                                               [--show-chars]
                                               [--out concept.overlay.png]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def _hex_rgba(h: str, alpha: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("scene_id")
    ap.add_argument("--alpha", type=int, default=160,
                    help="Outline alpha (0-255). Default 160 — visible but doesn't bury the painting.")
    ap.add_argument("--show-chars", action="store_true",
                    help="Draw the legend char in the center of each non-vast cell.")
    ap.add_argument("--out", default="concept.overlay.png")
    ap.add_argument("--concept-name", default="concept.png")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    scene_dir = root / "assets" / "scenes" / args.scene_id
    concept_p = scene_dir / "bg-near" / args.concept_name
    terrain_p = scene_dir / "terrain.json"
    out_p = scene_dir / "bg-near" / args.out

    if not concept_p.exists():
        raise SystemExit(f"missing {concept_p}")
    if not terrain_p.exists():
        raise SystemExit(f"missing {terrain_p}")

    img = Image.open(concept_p).convert("RGBA")
    api_w, api_h = img.size
    terrain = json.loads(terrain_p.read_text(encoding="utf-8"))
    gw, gh = terrain["grid_size"]
    rows = terrain["rows"]
    legend = terrain["legend"]

    cell_w = api_w / max(gw, 1)
    cell_h = api_h / max(gh, 1)

    overlay = Image.new("RGBA", (api_w, api_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    stroke = max(1, int(round(min(cell_w, cell_h) * 0.06)))

    # Try to load a small font for char labels.
    font = None
    if args.show_chars:
        font_size = max(8, int(round(min(cell_w, cell_h) * 0.45)))
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("DejaVuSans.ttf", font_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

    for y, row in enumerate(rows):
        if len(row) != gw:
            continue
        py_lo = int(round(y * cell_h))
        py_hi = int(round((y + 1) * cell_h))
        for x, ch in enumerate(row):
            entry = legend.get(ch)
            if not isinstance(entry, dict):
                continue
            color_hex = entry.get("color")
            px_lo = int(round(x * cell_w))
            px_hi = int(round((x + 1) * cell_w))

            if color_hex:
                color = _hex_rgba(color_hex, alpha=args.alpha)
                draw.rectangle(
                    [(px_lo, py_lo), (px_hi - 1, py_hi - 1)],
                    outline=color, width=stroke,
                )
                if args.show_chars and font is not None:
                    cx = (px_lo + px_hi) / 2
                    cy = (py_lo + py_hi) / 2
                    bbox = draw.textbbox((cx, cy), ch, font=font, anchor="mm")
                    # Subtle dark backdrop so the char reads on any color.
                    draw.rectangle(bbox, fill=(0, 0, 0, 120))
                    draw.text((cx, cy), ch, fill=color, font=font, anchor="mm")
            else:
                # Vast cells: faint dotted/light outline so the grid is still
                # visible there for cross-check, but not loud.
                faint = (255, 255, 255, max(40, args.alpha // 4))
                draw.rectangle(
                    [(px_lo, py_lo), (px_hi - 1, py_hi - 1)],
                    outline=faint, width=1,
                )

    composed = Image.alpha_composite(img, overlay)
    composed.save(out_p, format="PNG")

    print(f"  scene_id:  {args.scene_id}")
    print(f"  concept:   {concept_p.relative_to(root)}  ({api_w}x{api_h})")
    print(f"  terrain:   {terrain_p.relative_to(root)}  (grid {gw}x{gh})")
    print(f"  cell:      {cell_w:.1f}x{cell_h:.1f} px on the concept canvas")
    print(f"  out:       {out_p.relative_to(root)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
