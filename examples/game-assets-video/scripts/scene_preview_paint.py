#!/usr/bin/env python3
"""scene_preview_paint.py — paint the first 12-tile landscape window.

Reads:
  - `assets/scenes/{scene_id}/layers/landscape.png` (static-only
    composite produced by `scene_layered_assemble.py`)
  - `assets/scenes/{scene_id}/samples/landscape/landscape.prompt.md`
    (AI-authored prompt produced by `author_landscape_prompt.py`)

Workflow:
  1. Crop leftmost 12x12-tile window from landscape.png and pre-resize
     to 1024x1024 with Lanczos. Save as
     `samples/landscape/landscape.skeleton.png`.
  2. Read the prompt MD from `samples/landscape/landscape.prompt.md`.
  3. Run Gemini image-edit (prompt-only restyle: skeleton as base,
     no reference images).
  4. Save the result as `samples/landscape/landscape.png` (1024x1024).

No prompt is built inside this script. The prompt is authored
separately by `scripts/author_landscape_prompt.py` (the
`04-preview-prompt` stage) so it can be inspected, edited, and
versioned before the image-gen call.

Outputs (in `assets/scenes/{scene_id}/samples/landscape/`):
    landscape.skeleton.png    — 1024x1024 cropped+resized skeleton
    landscape.png             — finished painted preview (1024x1024)
    landscape.seed.txt        — Gemini seed for reproducibility

Inputs already produced by upstream stages:
    landscape.prompt.md       — AI-authored image-edit prompt

Usage:
    python scripts/scene_preview_paint.py demo-grassland
    python scripts/scene_preview_paint.py demo-grassland --dry-run
    python scripts/scene_preview_paint.py demo-grassland --force
    python scripts/scene_preview_paint.py demo-grassland --window-cols 16
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from tokens_compile import find_project_root
from lib import budget
from lib.image_api import generate_image_with_edit


WINDOW_COLS_DEFAULT = 12
WINDOW_ROWS_DEFAULT = 12
PREVIEW_OUT_PX = 1024
DEFAULT_SKY_HEX = "#A8C8E0"
COST_CENTS = 5
SERVICE = "scene-landscape-preview"


def parse_sky_color(art_bible_text: str) -> str:
    if not art_bible_text:
        return DEFAULT_SKY_HEX
    import re
    m = re.search(r"sky[^#\n]{0,40}(#[0-9A-Fa-f]{6})", art_bible_text)
    if m:
        return m.group(1)
    return DEFAULT_SKY_HEX


def hex_to_rgba(hex_str: str) -> tuple[int, int, int, int]:
    h = hex_str.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def build_skeleton(
    landscape_png: Path,
    out_path: Path,
    *,
    window_cols: int,
    window_rows: int,
    tile_px: int,
    pad_color: tuple[int, int, int, int],
) -> Path:
    src = Image.open(landscape_png).convert("RGBA")
    crop_w = window_cols * tile_px
    crop_h = window_rows * tile_px

    actual_w = min(crop_w, src.width)
    actual_h = min(crop_h, src.height)
    cropped = src.crop((0, 0, actual_w, actual_h))

    if (actual_w, actual_h) != (crop_w, crop_h):
        canvas = Image.new("RGBA", (crop_w, crop_h), pad_color)
        canvas.paste(cropped, (0, 0), cropped)
        cropped = canvas

    resized = cropped.resize((PREVIEW_OUT_PX, PREVIEW_OUT_PX), Image.LANCZOS)
    resized.save(out_path, format="PNG")
    return out_path


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    p.add_argument("scene_id")
    p.add_argument("--dry-run", action="store_true", help="write skeleton only; skip image-gen")
    p.add_argument("--force", action="store_true", help="regenerate even if landscape.png already exists")
    p.add_argument("--window-cols", type=int, default=WINDOW_COLS_DEFAULT)
    p.add_argument("--window-rows", type=int, default=WINDOW_ROWS_DEFAULT)
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id

    assembly_path = scene_dir / "scene.assembly.json"
    if not assembly_path.exists():
        print(f"error: {assembly_path} not found", file=sys.stderr)
        return 1
    assembly = json.loads(assembly_path.read_text(encoding="utf-8"))

    landscape_png = scene_dir / "layers" / "landscape.png"
    if not landscape_png.exists():
        print(
            f"error: {landscape_png} not found — run scene_layered_assemble.py first",
            file=sys.stderr,
        )
        return 1

    samples_dir = scene_dir / "samples" / "landscape"
    samples_dir.mkdir(parents=True, exist_ok=True)

    prompt_path = samples_dir / "landscape.prompt.md"
    if not prompt_path.exists():
        print(
            f"error: {prompt_path} not found — run scripts/author_landscape_prompt.py first",
            file=sys.stderr,
        )
        return 1
    prompt = prompt_path.read_text(encoding="utf-8").strip()

    tile_px = int(assembly["canvas"]["concept_tile_px"])

    art_bible_path = project_root / "assets" / "ART_BIBLE.md"
    art_bible_text = art_bible_path.read_text(encoding="utf-8") if art_bible_path.exists() else ""
    pad_color = hex_to_rgba(parse_sky_color(art_bible_text))

    skeleton_path = samples_dir / "landscape.skeleton.png"
    out_path = samples_dir / "landscape.png"

    build_skeleton(
        landscape_png,
        skeleton_path,
        window_cols=args.window_cols,
        window_rows=args.window_rows,
        tile_px=tile_px,
        pad_color=pad_color,
    )

    print(f"  skeleton → {skeleton_path.name} ({PREVIEW_OUT_PX}x{PREVIEW_OUT_PX})")
    print(f"  prompt   ← {prompt_path.name} ({len(prompt)} chars)")

    if args.dry_run:
        print(f"  dry-run: skipping image-gen")
        return 0

    if out_path.exists() and not args.force:
        print(f"  {out_path.name} already exists — pass --force to regenerate")
        return 0

    note = f"scene={args.scene_id} window={args.window_cols}x{args.window_rows}"
    with budget.charged(project_root, COST_CENTS, SERVICE, note=note):
        img_bytes, seed = generate_image_with_edit(
            prompt=prompt,
            base_image_path=skeleton_path,
            reference_paths=None,
            resolution=PREVIEW_OUT_PX,
        )
        out_path.write_bytes(img_bytes)
        seed_path = samples_dir / "landscape.seed.txt"
        seed_path.write_text(str(seed), encoding="utf-8")

    print(f"  preview  → {out_path.name} ({PREVIEW_OUT_PX}x{PREVIEW_OUT_PX}, seed={seed})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
