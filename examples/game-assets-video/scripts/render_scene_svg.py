#!/usr/bin/env python3
"""render_scene_svg.py — Rasterize the scene-wide bg-near SVG and slice into per-chunk PNGs + per-chunk specs.

The 00-scene-svg agent writes ONE wide SVG covering the full scene canvas
(`bg-near/scene-skeleton.svg`) plus a structured companion (`scene-spec.json`).
This script is deterministic glue: cairosvg renders the SVG once, then slices
the wide PNG into per-chunk skeleton PNGs at the SAME beat-driven section
ranges the WBS uses to spawn chunk tasks. It also extracts per-chunk slices
from `scene-spec.json` and writes them into each chunk's directory.

Reads:
  - assets/scenes/{id}/bg-near/scene-skeleton.svg
  - assets/scenes/{id}/bg-near/scene-spec.json
  - assets/scenes/{id}/stage.json

Writes:
  - assets/scenes/{id}/bg-near/scene-skeleton.png       (full-scene rasterized)
  - assets/scenes/{id}/bg-near/chunks/chunk-{N}/chunk.skeleton.png
  - assets/scenes/{id}/bg-near/chunks/chunk-{N}/chunk.svg     (the chunk's slice as standalone SVG, for debug)
  - assets/scenes/{id}/bg-near/chunks/chunk-{N}/chunk-spec.json

Usage:
  python scripts/render_scene_svg.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import cairosvg
from PIL import Image

from lib.sprite import find_project_root


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    bg_near = scene_dir / "bg-near"

    svg_path = bg_near / "scene-skeleton.svg"
    spec_path = bg_near / "scene-spec.json"
    stage_path = scene_dir / "stage.json"
    if not svg_path.exists():
        raise SystemExit(f"{svg_path} not found — run 00-scene-svg first")
    if not spec_path.exists():
        raise SystemExit(f"{spec_path} not found — run 00-scene-svg first")
    if not stage_path.exists():
        raise SystemExit(f"{stage_path} not found — run scene/02b-stage first")

    stage = json.loads(stage_path.read_text(encoding="utf-8"))
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    target_w = int(stage["background"]["target_width_px"])
    target_h = int(stage["background"]["target_height_px"])

    # 1) Render the full-scene SVG to a PNG.
    full_png = bg_near / "scene-skeleton.png"
    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(full_png),
        output_width=target_w,
        output_height=target_h,
    )
    img = Image.open(full_png).convert("RGBA")
    if img.size != (target_w, target_h):
        img = img.resize((target_w, target_h), Image.LANCZOS)
        img.save(full_png, format="PNG")
    sys.stderr.write(
        f"  rendered {full_png.relative_to(project_root)} ({target_w}x{target_h})\n"
    )

    # 2) Read the SVG body once so we can carve per-chunk SVG slices for debug.
    svg_text = svg_path.read_text(encoding="utf-8")

    # 3) Slice the full PNG and the SVG by chunk x ranges committed in scene-spec.
    chunks = spec.get("chunks") or []
    if not chunks:
        raise SystemExit("scene-spec.json has no chunks[]")

    palette = spec.get("palette") or {}
    canvas = spec.get("canvas") or {}
    tile_size_px = int(canvas.get("tile_size_px") or stage.get("tile_size_px") or 16)
    baseline_px = int(canvas.get("baseline_px") or round(target_h * 0.50))

    for ch in chunks:
        idx = int(ch["chunk_index"])
        x_lo, x_hi = ch["x_px_range"]
        x_lo, x_hi = int(x_lo), int(x_hi)
        chunk_dir = bg_near / "chunks" / f"chunk-{idx}"
        chunk_dir.mkdir(parents=True, exist_ok=True)

        # 3a. Crop the rasterized PNG to this chunk's x range (no overlap pad —
        # the painter will re-add the seam strip from prev's right edge).
        crop = img.crop((x_lo, 0, x_hi, target_h))
        skel = chunk_dir / "chunk.skeleton.png"
        crop.save(skel, format="PNG")

        # 3b. Carve out the chunk's <g id="chunk-NNN"> and write a standalone
        # SVG for that chunk (handy for visual debug; not required by paint).
        chunk_w = x_hi - x_lo
        # Match `<g id="chunk-{idx}" ...> ... </g>` (or chunk-{idx:03d}).
        candidates = [f'chunk-{idx}', f'chunk-{idx:03d}']
        chunk_g = None
        for cand in candidates:
            m = re.search(
                r'<g[^>]*\bid="' + re.escape(cand) + r'"[^>]*>(.*?)</g>',
                svg_text,
                flags=re.S,
            )
            if m:
                chunk_g = m.group(0)
                break
        if not chunk_g:
            chunk_g = f'<g id="chunk-{idx}"><!-- group not found in scene-skeleton.svg --></g>'
        # Translate the group so the chunk's x_lo becomes x=0 in the standalone SVG.
        chunk_svg = (
            f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'width="{chunk_w}" height="{target_h}" '
            f'viewBox="0 0 {chunk_w} {target_h}" shape-rendering="geometricPrecision">\n'
            f'  <rect data-kind="chroma-bg" x="0" y="0" '
            f'width="{chunk_w}" height="{target_h}" '
            f'fill="{palette.get("chroma", "#00FF00")}" />\n'
            f'  <g transform="translate({-x_lo},0)">\n    {chunk_g}\n  </g>\n'
            f'</svg>\n'
        )
        (chunk_dir / "chunk.svg").write_text(chunk_svg, encoding="utf-8")

        # 3c. Derive a per-chunk chunk-spec.json from the scene spec slice +
        # the canonical palette. Coords stay in CHUNK-LOCAL pixels (subtract x_lo).
        def to_local(item: dict) -> dict:
            out = dict(item)
            if "x_px" in out:
                out["x_px"] = int(out["x_px"]) - x_lo
            return out

        chunk_spec = {
            "chunk_id": f"chunk-{idx}",
            "chunk_index": idx,
            "chunk_count": len(chunks),
            "x_tile_range": ch["x_tile_range"],
            "x_px_range":   [0, chunk_w],
            "global_x_px_range": [x_lo, x_hi],
            "canvas": {
                "width_px": chunk_w,
                "height_px": target_h,
                "tile_size_px": tile_size_px,
            },
            "baseline_px": baseline_px,
            "tile_size_px": tile_size_px,
            "palette": palette,
            "section_label": ch.get("section_label", ""),
            "section_kind":  ch.get("section_kind", ""),
            "biome_variant": ch.get("biome_variant", ""),
            "biome_key":     ch.get("biome_key", "generic"),
            "ground_type":   ch.get("ground_type", ""),
            "narrative":     ch.get("narrative", ""),
            "elevation":     ch.get("elevation", []),
            "props":     [to_local(p) for p in (ch.get("props") or [])],
            "hazards":   [to_local(h) for h in (ch.get("hazards") or [])],
            "platforms": [to_local(p) for p in (ch.get("platforms") or [])],
        }
        (chunk_dir / "chunk-spec.json").write_text(
            json.dumps(chunk_spec, indent=2) + "\n", encoding="utf-8"
        )

        sys.stderr.write(
            f"  chunk-{idx}: x=[{x_lo},{x_hi}] -> {chunk_dir.relative_to(project_root)}\n"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
