#!/usr/bin/env python3
"""build_scene_preview.py — Lay every scene asset out side-by-side for visual QA.

Pure compositing — no paid API call. NOT a playable scene mock-up; just
a labelled sheet that lets the user confirm assets exist, are
stylistically coherent, and have correct transparency. Layout:

  ┌────────────────────────────────────────┐
  │ BG STACK (far / mid / near composited) │  ← row 1: parallax check
  ├────────────────────────────────────────┤
  │ TILESHEET (whole sheet, scaled)        │  ← row 2: tilesheet check
  ├────────────────────────────────────────┤
  │ PROPS (idle frame 0, side by side)     │  ← row 3: prop style check
  ├────────────────────────────────────────┤
  │ CHARACTERS (idle frame 0, side by side)│  ← row 4: character check
  └────────────────────────────────────────┘

Each row has a small label so the user knows what they're looking at.
Eyeball the result to spot: transparency failures (forest-near solid blue),
palette clashes between layers/props, tile-edge mismatches, prop-style
drift, missing assets.

Usage:
  python scripts/build_scene_preview.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from lib.sprite import find_project_root


PREVIEW_W = 1280
PREVIEW_H = 1280
ROW_PADDING = 12
LABEL_BAND_H = 22
BG_FILL = (32, 32, 40, 255)
BAND_FILL = (48, 48, 60, 255)
LABEL_RGB = (220, 220, 230)
ROW_BG_H = 360       # parallax stack
ROW_TILE_H = 260     # tilesheet
ROW_PROP_H = 180     # props
ROW_CHAR_H = 240     # characters


def _draw_label(canvas: Image.Image, text: str, y: int) -> int:
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, y, PREVIEW_W, y + LABEL_BAND_H), fill=BAND_FILL)
    draw.text((8, y + 4), text, fill=LABEL_RGB)
    return y + LABEL_BAND_H


def _paste_bg_stack(canvas: Image.Image, scene_dir: Path, y0: int) -> int:
    """Composite far / mid / near onto a sub-canvas of fixed size, then paste."""
    sub = Image.new("RGBA", (PREVIEW_W, ROW_BG_H), BG_FILL)
    for layer in ("far", "mid", "near"):
        layer_path = scene_dir / f"bg-{layer}.png"
        if not layer_path.exists():
            continue
        im = Image.open(layer_path).convert("RGBA")
        ratio = ROW_BG_H / max(im.size[1], 1)
        new_w = max(1, int(im.size[0] * ratio))
        im = im.resize((new_w, ROW_BG_H), Image.LANCZOS)
        x = 0
        while x < PREVIEW_W:
            sub.alpha_composite(im, (x, 0))
            x += new_w
    canvas.alpha_composite(sub, (0, y0))
    return y0 + ROW_BG_H


def _paste_tilesheet(canvas: Image.Image, scene_dir: Path, y0: int) -> int:
    sub = Image.new("RGBA", (PREVIEW_W, ROW_TILE_H), BG_FILL)
    sheet_path = scene_dir / "tilesheet" / "tilesheet.png"
    if sheet_path.exists():
        sheet = Image.open(sheet_path).convert("RGBA")
        ratio = (ROW_TILE_H - 16) / max(sheet.size[1], 1)
        new_w = max(1, int(sheet.size[0] * ratio))
        new_h = max(1, int(sheet.size[1] * ratio))
        scaled = sheet.resize((new_w, new_h), Image.LANCZOS)
        x = (PREVIEW_W - new_w) // 2
        y = (ROW_TILE_H - new_h) // 2
        sub.alpha_composite(scaled, (x, y))
    canvas.alpha_composite(sub, (0, y0))
    return y0 + ROW_TILE_H


def _iter_prop_atlases(project_root: Path, scene_dir: Path):
    """Yield (label, atlas_path) for every available prop idle sheet."""
    objects_root = project_root / "assets" / "objects"
    if objects_root.exists():
        for obj_dir in sorted(objects_root.iterdir()):
            if not obj_dir.is_dir():
                continue
            atlas = obj_dir / "spritesheets" / "idle" / "idle.atlas.json"
            if atlas.exists():
                yield (obj_dir.name, atlas)
    props_root = scene_dir / "props"
    if props_root.exists():
        for prop_dir in sorted(props_root.iterdir()):
            if not prop_dir.is_dir():
                continue
            ss = prop_dir / "spritesheets"
            if not ss.exists():
                continue
            for state_dir in sorted(ss.iterdir()):
                atlas = state_dir / f"{state_dir.name}.atlas.json"
                if atlas.exists():
                    yield (f"{prop_dir.name}/{state_dir.name}", atlas)
                    break


def _crop_first_frame(atlas_path: Path) -> Image.Image | None:
    atlas = json.loads(atlas_path.read_text(encoding="utf-8"))
    sheet_path = atlas_path.parent / atlas.get("image", "")
    if not sheet_path.exists():
        return None
    sheet = Image.open(sheet_path).convert("RGBA")
    f0 = atlas["frames"][0]["frame"]
    return sheet.crop((f0["x"], f0["y"], f0["x"] + f0["w"], f0["y"] + f0["h"]))


def _paste_thumbnail_row(
    canvas: Image.Image, items: list[tuple[str, Image.Image]], y0: int, row_h: int,
) -> int:
    sub = Image.new("RGBA", (PREVIEW_W, row_h), BG_FILL)
    if not items:
        canvas.alpha_composite(sub, (0, y0))
        return y0 + row_h
    draw = ImageDraw.Draw(sub)
    cell_w = max(80, PREVIEW_W // max(len(items), 1))
    inner_h = row_h - 18
    for i, (label, im) in enumerate(items):
        ratio = inner_h / max(im.size[1], 1)
        new_w = max(1, int(im.size[0] * ratio))
        new_h = max(1, int(im.size[1] * ratio))
        if new_w > cell_w - 8:
            ratio = (cell_w - 8) / max(im.size[0], 1)
            new_w = max(1, int(im.size[0] * ratio))
            new_h = max(1, int(im.size[1] * ratio))
        thumb = im.resize((new_w, new_h), Image.LANCZOS)
        x = i * cell_w + (cell_w - new_w) // 2
        y = (inner_h - new_h) // 2
        sub.alpha_composite(thumb, (x, y))
        draw.text((i * cell_w + 4, inner_h + 2), label[:24], fill=LABEL_RGB)
    canvas.alpha_composite(sub, (0, y0))
    return y0 + row_h


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    if not scene_dir.exists():
        raise SystemExit(f"{scene_dir} not found")

    canvas = Image.new("RGBA", (PREVIEW_W, PREVIEW_H), BG_FILL)
    y = 0
    y = _draw_label(canvas, f"[{args.scene_id}] BG STACK  (far + mid + near composited; transparency check)", y)
    y = _paste_bg_stack(canvas, scene_dir, y)
    y += ROW_PADDING

    y = _draw_label(canvas, "TILESHEET  (whole sheet; tile-edge consistency check)", y)
    y = _paste_tilesheet(canvas, scene_dir, y)
    y += ROW_PADDING

    prop_items: list[tuple[str, Image.Image]] = []
    for label, atlas in _iter_prop_atlases(project_root, scene_dir):
        crop = _crop_first_frame(atlas)
        if crop is not None:
            prop_items.append((label, crop))
    y = _draw_label(canvas, f"PROPS  (idle frame; cross-prop style consistency check) [{len(prop_items)} items]", y)
    y = _paste_thumbnail_row(canvas, prop_items, y, ROW_PROP_H)
    y += ROW_PADDING

    char_items: list[tuple[str, Image.Image]] = []
    chars_root = project_root / "assets" / "characters"
    if chars_root.exists():
        for char_dir in sorted(chars_root.iterdir()):
            if not char_dir.is_dir():
                continue
            for state in ("idle", "walk"):
                atlas = char_dir / "spritesheets" / state / f"{state}.atlas.json"
                if atlas.exists():
                    crop = _crop_first_frame(atlas)
                    if crop is not None:
                        char_items.append((f"{char_dir.name}/{state}", crop))
                    break
    y = _draw_label(canvas, f"CHARACTERS  (idle frame; character vs scene-style check) [{len(char_items)} items]", y)
    y = _paste_thumbnail_row(canvas, char_items, y, ROW_CHAR_H)

    out = scene_dir / "preview.png"
    canvas.save(out, format="PNG")
    sys.stderr.write(
        f"  wrote {out.relative_to(project_root)} "
        f"({PREVIEW_W}x{PREVIEW_H}, "
        f"props={len(prop_items)}, chars={len(char_items)})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
