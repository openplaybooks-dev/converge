#!/usr/bin/env python3
"""
compose_preview.py — render composition.json to a flat blueprint PNG.

Output serves two purposes:
  1. Human visual review of layout before expensive blend call.
  2. Acts as a strong layout anchor when fed to the blender (Nano-banana
     follows the blueprint's positions remarkably well when shown alongside
     element refs + "use this image as layout").

Usage:
  python scripts/compose_preview.py <composition.json> [--debug]

  <composition.json>       e.g. compositions/sh-0042/start.json
  --debug                  also writes .debug.png with element borders + labels
  --no-resize-canvas       keep base image native size (default: scale to canvas.w/h)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from lib.composition import Composition, Element, find_project_root  # noqa: E402


# ---------------------------------------------------------------------------
# Rendering


def _fit_base(base_img: Image.Image, cw: int, ch: int, fit: str) -> Image.Image:
    """Resize `base_img` to the canvas per `fit` policy."""
    if fit == "stretch":
        return base_img.resize((cw, ch), Image.LANCZOS)

    bw, bh = base_img.size
    if fit == "contain":
        scale = min(cw / bw, ch / bh)
    else:  # cover
        scale = max(cw / bw, ch / bh)

    nw, nh = int(round(bw * scale)), int(round(bh * scale))
    resized = base_img.resize((nw, nh), Image.LANCZOS)

    canvas = Image.new("RGB", (cw, ch), (20, 20, 24))
    ox = (cw - nw) // 2
    oy = (ch - nh) // 2
    if fit == "cover":
        canvas.paste(resized, (ox, oy))
    else:  # contain — pad with solid
        canvas.paste(resized, (ox, oy))
    return canvas


def _paste_element(canvas: Image.Image, el: Element, el_img: Image.Image) -> None:
    cw, ch = canvas.size
    x0, y0, x1, y1 = el.bbox_px(cw, ch)
    target_w = max(1, x1 - x0)
    target_h = max(1, y1 - y0)

    # prepare element — resize, flip, rotate
    working = el_img.copy()
    if el.flip_horizontal:
        working = working.transpose(Image.FLIP_LEFT_RIGHT)
    if el.flip_vertical:
        working = working.transpose(Image.FLIP_TOP_BOTTOM)
    working = working.resize((target_w, target_h), Image.LANCZOS)
    if el.rotation_deg:
        working = working.rotate(-el.rotation_deg, resample=Image.BICUBIC, expand=True)

    # opacity
    if working.mode != "RGBA":
        working = working.convert("RGBA")
    if el.opacity < 1.0:
        alpha = working.split()[3]
        alpha = alpha.point(lambda a: int(a * el.opacity))
        working.putalpha(alpha)

    # paste (centered on the element's bbox center for rotated content)
    ew, eh = working.size
    px = x0 + (target_w - ew) // 2
    py = y0 + (target_h - eh) // 2
    canvas.paste(working, (px, py), working)


def _load_element_image(el: Element) -> Image.Image:
    try:
        return Image.open(el.ref)
    except FileNotFoundError:
        # fail-soft: return solid placeholder so preview still renders
        return _placeholder(el.id, size=(512, 512))


def _placeholder(label: str, size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", (w, h), (200, 50, 50, 220))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", max(16, h // 12))
    except OSError:
        font = ImageFont.load_default()
    text = f"MISSING\n{label}"
    draw.multiline_text((w // 2, h // 2), text, fill=(255, 255, 255, 255),
                        font=font, anchor="mm", align="center")
    draw.rectangle([(0, 0), (w - 1, h - 1)], outline=(255, 255, 0, 255), width=8)
    return img


def render_preview(comp: Composition) -> Image.Image:
    cw, ch = comp.canvas_w, comp.canvas_h

    try:
        base_img = Image.open(comp.base_ref).convert("RGB")
    except FileNotFoundError:
        base_img = Image.new("RGB", (cw, ch), (30, 30, 36))

    canvas = _fit_base(base_img, cw, ch, comp.base_fit)

    # elements in z_order ascending (already sorted at load time)
    for el in comp.elements:
        el_img = _load_element_image(el)
        _paste_element(canvas, el, el_img)

    return canvas


def render_debug(comp: Composition, preview: Image.Image) -> Image.Image:
    """Overlay element bboxes + ids + z_order for visual QC."""
    dbg = preview.copy()
    draw = ImageDraw.Draw(dbg)
    try:
        font = ImageFont.truetype("arial.ttf", max(14, comp.canvas_h // 50))
    except OSError:
        font = ImageFont.load_default()

    cw, ch = dbg.size

    # canvas border
    draw.rectangle([(0, 0), (cw - 1, ch - 1)], outline=(0, 255, 0, 255), width=3)

    for el in comp.elements:
        x0, y0, x1, y1 = el.bbox_px(cw, ch)
        color = {
            "character": (255, 80, 80),
            "prop": (80, 180, 255),
            "overlay": (255, 220, 80),
            "vfx": (220, 80, 255),
        }.get(el.type, (200, 200, 200))
        draw.rectangle([(x0, y0), (x1, y1)], outline=color, width=4)
        label = f"{el.id}  z={el.z_order}  ({el.type})"
        # shadow
        draw.text((x0 + 9, y0 + 9), label, fill=(0, 0, 0), font=font)
        draw.text((x0 + 8, y0 + 8), label, fill=color, font=font)

    # meta corner
    meta = f"{comp.shot_id} / {comp.frame} / {cw}x{ch}"
    draw.text((11, ch - 31), meta, fill=(0, 0, 0), font=font)
    draw.text((10, ch - 32), meta, fill=(255, 255, 255), font=font)

    return dbg


# ---------------------------------------------------------------------------
# CLI


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("composition", type=Path)
    ap.add_argument("--debug", action="store_true", help="also emit .debug.png")
    ap.add_argument("-o", "--out", type=Path, default=None,
                    help="output path (default: alongside composition as .preview.png)")
    args = ap.parse_args()

    project_root = find_project_root(args.composition.parent)
    comp = Composition.load(args.composition, project_root)

    out_path = args.out or args.composition.with_suffix(".preview.png")
    out_path.parent.mkdir(parents=True, exist_ok=True)

    preview = render_preview(comp)
    preview.save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path.relative_to(project_root) if out_path.is_relative_to(project_root) else out_path}")

    if args.debug:
        debug_path = out_path.with_suffix(".debug.png")
        debug = render_debug(comp, preview)
        debug.save(debug_path, "PNG", optimize=True)
        print(f"wrote {debug_path.relative_to(project_root) if debug_path.is_relative_to(project_root) else debug_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
