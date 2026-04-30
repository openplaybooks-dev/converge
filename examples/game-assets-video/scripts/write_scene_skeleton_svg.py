#!/usr/bin/env python3
"""write_scene_skeleton_svg.py — Generate bg-near/scene-skeleton.svg + .png preview.

Reads stage.json + scene-plan.json, picks a forest-biome palette, builds a single
SVG covering the whole scene canvas. The SVG is the visual spec for the bg-near
foreground: a continuous ground polyline derived from stage.elevation, plus
per-chunk groups containing decorative props, hazard markers, and platform
footprints.

Usage:
  python scripts/write_scene_skeleton_svg.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

from lib.sprite import find_project_root

try:
    import cairosvg  # type: ignore
    _HAVE_CAIROSVG = True
except Exception:
    _HAVE_CAIROSVG = False


PALETTE = {
    "ground_fill":   "#6FAA3E",
    "ground_stroke": "#3A5C24",
    "foliage_fill":  "#2E5530",
    "foliage_stroke": "#1A3A1C",
    "accent_water":  "#6BB7DB",
    "accent_flower": "#E8C547",
    "rock":          "#7A6F5A",
    "wood":          "#5B3B1C",
}

KINDS_BY_BIOME = {
    "wetland": [
        ("reeds",       48,  80, "small"),
        ("cattail",     40,  72, "small"),
        ("lily-pad",    56,  32, "small"),
        ("mossy-stone", 64,  48, "medium"),
    ],
    "elevated": [
        ("rock",        96,  64, "medium"),
        ("grass-tuft",  72,  56, "small"),
        ("tree-stump", 128,  96, "large"),
        ("flowers",     48,  48, "tiny"),
        ("moss-patch",  80,  32, "small"),
    ],
    "path": [
        ("grass-tuft",  72,  64, "small"),
        ("flowers",     48,  48, "tiny"),
        ("dirt-clod",   64,  32, "small"),
        ("rock",        80,  56, "medium"),
    ],
    "exit": [
        ("tree-stump", 128, 112, "large"),
        ("grass-tuft",  72,  64, "small"),
        ("flowers",     48,  48, "tiny"),
        ("berries",     40,  40, "tiny"),
    ],
    "open": [
        ("grass-tuft",  72,  64, "small"),
        ("flowers",     48,  48, "tiny"),
        ("rock",        96,  64, "medium"),
        ("mushrooms",   40,  40, "tiny"),
        ("tree-stump", 128,  96, "large"),
    ],
}


def biome_pool(biome: str, ground: str):
    b = biome.lower()
    if "wetland" in b or ground == "water":
        return KINDS_BY_BIOME["wetland"]
    if "elevated" in b:
        return KINDS_BY_BIOME["elevated"]
    if "path" in b:
        return KINDS_BY_BIOME["path"]
    if "exit" in b:
        return KINDS_BY_BIOME["exit"]
    return KINDS_BY_BIOME["open"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id

    stage = json.loads((scene_dir / "stage.json").read_text(encoding="utf-8"))
    TS = int(stage["tile_size_px"])
    TW = int(stage["background"]["target_width_px"])
    TH = int(stage["background"]["target_height_px"])
    BASELINE = TH // 2
    REF_Y = 14
    AMP = 32

    def y_at_tile(yt: int) -> int:
        return BASELINE + (yt - REF_Y) * AMP

    elev = sorted(stage.get("elevation", []), key=lambda e: e["x_tile"])
    poly_pts = [(int(e["x_tile"]) * TS, y_at_tile(int(e["y_tile"]))) for e in elev]
    if not poly_pts or poly_pts[0][0] > 0:
        poly_pts.insert(0, (0, poly_pts[0][1] if poly_pts else BASELINE))
    if poly_pts[-1][0] < TW:
        poly_pts.append((TW, poly_pts[-1][1]))

    def ground_y_at_x(x_px: int) -> int:
        for i in range(len(poly_pts) - 1):
            x1, y1 = poly_pts[i]
            x2, y2 = poly_pts[i + 1]
            if x1 <= x_px <= x2:
                if x2 == x1:
                    return y1
                t = (x_px - x1) / (x2 - x1)
                return int(y1 + t * (y2 - y1))
        return poly_pts[-1][1]

    ground_top_pts = " ".join(f"{int(x)},{int(y)}" for x, y in poly_pts)
    ground_polygon = (
        f'<polygon data-kind="ground-fill" '
        f'fill="{PALETTE["ground_fill"]}" stroke="{PALETTE["ground_stroke"]}" '
        f'stroke-width="3" '
        f'points="{ground_top_pts} {TW},{TH} 0,{TH}" />'
    )

    chunks = stage.get("chunks", [])
    beats = stage.get("beats", [])
    hazards = stage.get("hazards", [])
    platforms = stage.get("platforms", [])

    def section_label_for(i: int) -> str:
        if i < len(beats) - 1:
            a, b = beats[i], beats[i + 1]
            return f'{a.get("label","")} → {b.get("label","")}'
        return chunks[i].get("id", f"chunk-{i}")

    groups = []
    for i, ch in enumerate(chunks):
        x_lo = int(ch["x_tiles"][0]) * TS
        x_hi = int(ch["x_tiles"][1]) * TS
        biome = ch.get("biome_variant", "grassland")
        ground = ch.get("ground_type", "grass")
        elements = []

        # Hazards inside this chunk's tile range
        for h in hazards:
            xt = int(h["x_tile"])
            if int(ch["x_tiles"][0]) <= xt < int(ch["x_tiles"][1]):
                hx = xt * TS
                hy = ground_y_at_x(hx) - 4
                hazard_kind = h.get("kind", "water")
                fill = PALETTE["accent_water"] if hazard_kind == "water" else PALETTE["foliage_stroke"]
                elements.append(
                    f'<rect data-kind="hazard-marker" data-hazard-kind="{hazard_kind}" '
                    f'fill="{fill}" stroke="{PALETTE["foliage_stroke"]}" stroke-width="2" '
                    f'x="{hx - 48}" y="{hy}" width="96" height="48" />'
                )

        # Platforms overlapping this chunk
        for p in platforms:
            px_lo = int(p["x_tiles"][0]) * TS
            px_hi = int(p["x_tiles"][1]) * TS
            if px_hi > x_lo and px_lo < x_hi:
                base_y = ground_y_at_x((px_lo + px_hi) // 2) - 8
                w = px_hi - px_lo
                elements.append(
                    f'<rect data-kind="platform-base" data-platform-kind="{p.get("kind","ledge")}" '
                    f'fill="{PALETTE["wood"]}" stroke="{PALETTE["foliage_stroke"]}" stroke-width="2" '
                    f'x="{px_lo}" y="{base_y}" width="{w}" height="32" />'
                )

        # Decorative props
        chunk_w = x_hi - x_lo
        n_props = max(4, min(7, chunk_w // 80))
        rng = random.Random(args.seed * 13 + i * 37 + 1)
        pool = biome_pool(biome, ground)

        # Avoid overlapping hazards/platforms when placing decorations
        occupied = []
        for h in hazards:
            xt = int(h["x_tile"])
            if int(ch["x_tiles"][0]) <= xt < int(ch["x_tiles"][1]):
                hx = xt * TS
                occupied.append((hx - 48, hx + 48))
        for p in platforms:
            px_lo = int(p["x_tiles"][0]) * TS
            px_hi = int(p["x_tiles"][1]) * TS
            if px_hi > x_lo and px_lo < x_hi:
                occupied.append((px_lo, px_hi))

        placed = 0
        attempts = 0
        while placed < n_props and attempts < 40:
            attempts += 1
            kind, w0, h0, sclass = rng.choice(pool)
            w = max(24, w0 + rng.randint(-12, 12))
            h = max(24, h0 + rng.randint(-8, 12))
            margin = 16
            if chunk_w - 2 * margin - w <= 0:
                continue
            cx = rng.randint(x_lo + margin + w // 2, x_hi - margin - w // 2)
            if any(o_lo - w / 2 <= cx <= o_hi + w / 2 for o_lo, o_hi in occupied):
                continue
            gy = ground_y_at_x(cx)
            prop_x = cx - w // 2
            prop_y = gy - h

            if kind in ("flowers", "berries", "mushrooms"):
                fill = PALETTE["accent_flower"]
                stroke = PALETTE["foliage_stroke"]
            elif kind in ("rock", "mossy-stone", "dirt-clod", "moss-patch"):
                fill = PALETTE["rock"]
                stroke = PALETTE["foliage_stroke"]
            elif kind == "tree-stump":
                fill = PALETTE["wood"]
                stroke = PALETTE["foliage_stroke"]
            else:
                fill = PALETTE["foliage_fill"]
                stroke = PALETTE["foliage_stroke"]

            if kind in ("grass-tuft", "reeds", "cattail", "flowers", "mushrooms", "berries"):
                elements.append(
                    f'<polygon data-kind="{kind}" data-size-class="{sclass}" '
                    f'fill="{fill}" stroke="{stroke}" stroke-width="1" '
                    f'points="{prop_x},{gy} {cx},{prop_y} {prop_x + w},{gy}" />'
                )
            elif kind == "lily-pad":
                elements.append(
                    f'<ellipse data-kind="{kind}" data-size-class="{sclass}" '
                    f'fill="{fill}" stroke="{stroke}" stroke-width="1" '
                    f'cx="{cx}" cy="{gy - 8}" rx="{w // 2}" ry="{max(8, h // 4)}" />'
                )
            else:
                elements.append(
                    f'<rect data-kind="{kind}" data-size-class="{sclass}" '
                    f'fill="{fill}" stroke="{stroke}" stroke-width="1" '
                    f'x="{prop_x}" y="{prop_y}" width="{w}" height="{h}" rx="4" />'
                )
            placed += 1
            occupied.append((prop_x - 16, prop_x + w + 16))

        body = "\n    ".join(elements) if elements else ""
        groups.append(
            f'  <g id="chunk-{i}" data-x-px-range="{x_lo},{x_hi}" '
            f'data-section-label="{section_label_for(i)}" '
            f'data-biome="{biome}" data-ground="{ground}">\n'
            f'    {body}\n  </g>'
        )

    svg = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{TW}" height="{TH}" '
        f'viewBox="0 0 {TW} {TH}" shape-rendering="geometricPrecision">\n'
        f'  <rect data-kind="chroma-bg" x="0" y="0" width="{TW}" height="{TH}" fill="#00FF00" />\n'
        f'  {ground_polygon}\n' + "\n".join(groups) + "\n</svg>\n"
    )

    out_svg = scene_dir / "bg-near" / "scene-skeleton.svg"
    out_svg.parent.mkdir(parents=True, exist_ok=True)
    out_svg.write_text(svg, encoding="utf-8")

    out_png = scene_dir / "bg-near" / "scene-skeleton.png"
    if _HAVE_CAIROSVG:
        try:
            cairosvg.svg2png(
                url=str(out_svg), write_to=str(out_png),
                output_width=TW, output_height=TH,
            )
            png_msg = f"  rasterized to {out_png.relative_to(project_root)}\n"
        except Exception as exc:
            png_msg = f"  cairosvg failed ({exc}); skipped PNG preview\n"
    else:
        png_msg = "  cairosvg not available; PNG preview skipped (open the SVG in a browser)\n"

    sys.stderr.write(
        f"  canvas: {TW}x{TH}\n"
        f"  chunks: {len(chunks)}\n"
        f"  ground polyline samples: {len(poly_pts)}\n"
        f"  hazards: {len(hazards)}, platforms: {len(platforms)}\n"
        f"  wrote {out_svg.relative_to(project_root)}\n"
        + png_msg
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
