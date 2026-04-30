#!/usr/bin/env python3
"""scene_stamp.py — assemble token instances into per-layer visual maps.

Reads `assets/scenes/{scene_id}/scene.assembly.json` + the biome
tokens library, places each token's sketch onto the right layer at
its declared position, and emits one SVG + one PNG per layer.

Outputs:
  assets/scenes/{scene_id}/maps/{layer_id}.svg
  assets/scenes/{scene_id}/maps/{layer_id}.png

Each PNG is at concept resolution (grid_size × concept_tile_px) and
serves as the image-edit input for the painter step.

Usage:
  python scripts/scene_stamp.py <scene_id>
  python scripts/scene_stamp.py <scene_id> --check     # validate, no write
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

from tokens_compile import find_project_root


# ---------------------------------------------------------------------------
# Tokens loading

def load_tokens(project_root: Path, biome: str) -> dict[str, dict[str, Any]]:
    biome_dir = project_root / "assets" / "tokens" / biome
    if not biome_dir.is_dir():
        raise FileNotFoundError(
            f"assets/tokens/{biome} not found — run scripts/tokens_compile.py first"
        )
    tokens: dict[str, dict[str, Any]] = {}
    # Per-asset folder layout: each token's compiled JSON sits at
    # `{category}/{token-id}/token.json`.
    for js in sorted(biome_dir.rglob("token.json")):
        data = json.loads(js.read_text(encoding="utf-8"))
        # Stash the directory the per-token JSON sits in so the stamper
        # can resolve `sketch_file` (a bare filename) relative to it.
        data["_dir"] = str(js.parent)
        tokens[data["id"]] = data
    if not tokens:
        raise RuntimeError(
            f"no compiled tokens in assets/tokens/{biome} — run scripts/tokens_compile.py"
        )
    return tokens


# ---------------------------------------------------------------------------
# Stamping

def stamp_layer(
    layer_id: str,
    layer_depth: float,
    canvas_w_px: int,
    canvas_h_px: int,
    concept_tile_px: int,
    grid_h: int,
    instances: list[dict[str, Any]],
    tokens: dict[str, dict[str, Any]],
    output_dir: Path,
) -> str:
    """Compose one SVG with all instances stamped onto the layer.

    Returns SVG source as a string. Instances are filtered to those
    routed to this layer (caller passes only the relevant ones).

    Each token's sketch is now a PNG concept image. We embed it via
    `<image href="..."/>` with a path relative to `output_dir` so the
    rasterizer (rsvg-convert) can resolve it. Legacy `.svg` sketches
    still fall through to the inline-SVG path as a transition aid.
    """
    parts: list[str] = []
    parts.append(
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="0 0 {canvas_w_px} {canvas_h_px}" '
        f'width="{canvas_w_px}" height="{canvas_h_px}">'
    )

    for inst in instances:
        token = tokens[inst["token"]]
        bw, bh = token["footprint"]
        anchor = token.get("anchor", "bottom-left")
        ax, ay = inst["at"]

        if anchor == "bottom-left":
            tile_x_lo = ax
            tile_y_lo = ay - bh + 1
        elif anchor == "top-left":
            tile_x_lo = ax
            tile_y_lo = ay
        elif anchor == "center":
            tile_x_lo = ax - bw // 2
            tile_y_lo = ay - bh // 2
        else:
            raise ValueError(f"unknown anchor '{anchor}'")

        x_px = tile_x_lo * concept_tile_px
        y_px = tile_y_lo * concept_tile_px
        w_px = bw * concept_tile_px
        h_px = bh * concept_tile_px

        sketch_path = Path(token["_dir"]) / token["sketch_file"]
        if not sketch_path.exists():
            print(f"  warning: sketch missing for '{token['id']}': {sketch_path}", file=sys.stderr)
            fill = (token.get("visual") or {}).get("fill", "#888888")
            parts.append(
                f'<rect x="{x_px}" y="{y_px}" width="{w_px}" height="{h_px}" '
                f'fill="{fill}" opacity="0.7"/>'
            )
            continue

        if sketch_path.suffix.lower() == ".png":
            # PNG concept: embed as a data: URI. Embedding (rather than
            # referencing by path) is required because rsvg-convert
            # rejects external `<image href="...">` resources for
            # security. preserveAspectRatio="none" lets the painter
            # trust footprint rectangles even if the PNG drifted ±2 px
            # on aspect.
            png_b64 = base64.b64encode(sketch_path.read_bytes()).decode("ascii")
            data_uri = f"data:image/png;base64,{png_b64}"
            parts.append(
                f'<image href="{data_uri}" xlink:href="{data_uri}" '
                f'x="{x_px}" y="{y_px}" width="{w_px}" height="{h_px}" '
                f'preserveAspectRatio="none"/>'
            )
            continue

        # Legacy SVG sketch — inline as before.
        sketch_svg = sketch_path.read_text(encoding="utf-8")
        inner = _extract_svg_inner(sketch_svg)
        sketch_w, sketch_h = token["sketch_size_px"]
        scale_x = w_px / sketch_w
        scale_y = h_px / sketch_h
        parts.append(
            f'<g transform="translate({x_px}, {y_px}) scale({scale_x:.6f}, {scale_y:.6f})">'
        )
        parts.append(inner)
        parts.append("</g>")

    parts.append("</svg>")
    return "".join(parts)


def _extract_svg_inner(svg_text: str) -> str:
    """Return the children of the outer <svg> element as a string."""
    start = svg_text.find(">", svg_text.find("<svg"))
    end = svg_text.rfind("</svg>")
    if start == -1 or end == -1:
        raise ValueError("malformed SVG: missing <svg> tags")
    return svg_text[start + 1 : end]


# ---------------------------------------------------------------------------
# Rasterization

def rasterize_svg(svg_path: Path, png_path: Path, w: int, h: int) -> None:
    """SVG → PNG. Prefers rsvg-convert if available; falls back to a
    flat raster placeholder if not."""
    if shutil.which("rsvg-convert"):
        # --unlimited lifts rsvg's default ~10MB document-size cap, which
        # we routinely exceed because PNG tokens are embedded as base64
        # data: URIs.
        subprocess.run(
            [
                "rsvg-convert",
                "--unlimited",
                "-w", str(w),
                "-h", str(h),
                "-o", str(png_path),
                str(svg_path),
            ],
            check=True,
        )
        return
    # Fallback: write a transparent PNG so downstream tooling at least
    # has the right dimensions on disk. Not ideal — install librsvg.
    print(
        f"  warning: rsvg-convert not found; writing transparent placeholder for {png_path}. "
        f"Install librsvg (brew install librsvg) for real rasterization.",
        file=sys.stderr,
    )
    from PIL import Image
    Image.new("RGBA", (w, h), (0, 0, 0, 0)).save(png_path)


# ---------------------------------------------------------------------------
# Validation

def validate_assembly(
    assembly: dict[str, Any],
    tokens: dict[str, dict[str, Any]],
) -> list[str]:
    errors: list[str] = []
    grid_w, grid_h = assembly["canvas"]["grid_size"]
    layer_ids = {layer["id"] for layer in assembly["layers"]}

    for i, inst in enumerate(assembly["tokens"]):
        token_id = inst.get("token")
        if token_id not in tokens:
            errors.append(f"tokens[{i}]: unknown token '{token_id}'")
            continue
        layer = inst.get("layer")
        if layer not in layer_ids:
            errors.append(
                f"tokens[{i}] ({token_id}): layer '{layer}' not in scene layers {sorted(layer_ids)}"
            )
            continue
        token = tokens[token_id]
        if layer not in token["layers"]:
            errors.append(
                f"tokens[{i}] ({token_id}): token not eligible for layer '{layer}' "
                f"(eligible: {token['layers']})"
            )
            continue
        bw, bh = token["footprint"]
        anchor = token.get("anchor", "bottom-left")
        ax, ay = inst["at"]
        if anchor == "bottom-left":
            x_lo, y_lo = ax, ay - bh + 1
        elif anchor == "top-left":
            x_lo, y_lo = ax, ay
        elif anchor == "center":
            x_lo, y_lo = ax - bw // 2, ay - bh // 2
        else:
            errors.append(f"tokens[{i}] ({token_id}): unknown anchor '{anchor}'")
            continue
        if x_lo < 0 or y_lo < 0 or x_lo + bw > grid_w or y_lo + bh > grid_h:
            errors.append(
                f"tokens[{i}] ({token_id}) at ({ax},{ay}) extends outside grid {grid_w}x{grid_h}"
            )
    return errors


# ---------------------------------------------------------------------------
# CLI

def main() -> int:
    p = argparse.ArgumentParser(description="Stamp scene assembly into per-layer visual maps")
    p.add_argument("scene_id")
    p.add_argument("--check", action="store_true")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    assembly_path = scene_dir / "scene.assembly.json"
    if not assembly_path.exists():
        print(f"error: {assembly_path} not found", file=sys.stderr)
        return 1
    assembly = json.loads(assembly_path.read_text(encoding="utf-8"))

    biome = assembly["biome"]
    tokens = load_tokens(project_root, biome)

    errors = validate_assembly(assembly, tokens)
    if errors:
        print(f"\nvalidation errors ({len(errors)}):", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 2

    grid_w, grid_h = assembly["canvas"]["grid_size"]
    concept_tile_px = int(assembly["canvas"]["concept_tile_px"])
    canvas_w = grid_w * concept_tile_px
    canvas_h = grid_h * concept_tile_px

    # Group instances by layer
    by_layer: dict[str, list[dict[str, Any]]] = {}
    for inst in assembly["tokens"]:
        by_layer.setdefault(inst["layer"], []).append(inst)

    if args.check:
        for layer in assembly["layers"]:
            layer_id = layer["id"]
            n = len(by_layer.get(layer_id, []))
            print(f"  {layer_id} (depth={layer['depth']}): {n} instances")
        print("OK (check only — no write)")
        return 0

    maps_dir = scene_dir / "maps"
    maps_dir.mkdir(parents=True, exist_ok=True)

    for layer in assembly["layers"]:
        layer_id = layer["id"]
        instances = by_layer.get(layer_id, [])
        svg = stamp_layer(
            layer_id=layer_id,
            layer_depth=float(layer["depth"]),
            canvas_w_px=canvas_w,
            canvas_h_px=canvas_h,
            concept_tile_px=concept_tile_px,
            grid_h=grid_h,
            instances=instances,
            tokens=tokens,
            output_dir=maps_dir,
        )
        svg_path = maps_dir / f"{layer_id}.svg"
        png_path = maps_dir / f"{layer_id}.png"
        svg_path.write_text(svg, encoding="utf-8")
        rasterize_svg(svg_path, png_path, canvas_w, canvas_h)
        print(f"  {layer_id}: {len(instances)} tokens → {svg_path.name} + {png_path.name}")

        terrain_only = [
            inst for inst in instances
            if tokens[inst["token"]].get("kind", "terrain") != "dynamic"
        ]
        if len(terrain_only) != len(instances):
            svg_l = stamp_layer(
                layer_id=layer_id,
                layer_depth=float(layer["depth"]),
                canvas_w_px=canvas_w,
                canvas_h_px=canvas_h,
                concept_tile_px=concept_tile_px,
                grid_h=grid_h,
                instances=terrain_only,
                tokens=tokens,
                output_dir=maps_dir,
            )
            svg_path_l = maps_dir / f"{layer_id}.landscape.svg"
            png_path_l = maps_dir / f"{layer_id}.landscape.png"
            svg_path_l.write_text(svg_l, encoding="utf-8")
            rasterize_svg(svg_path_l, png_path_l, canvas_w, canvas_h)
            print(
                f"  {layer_id}: {len(terrain_only)} terrain tokens "
                f"→ {svg_path_l.name} + {png_path_l.name} (landscape variant)"
            )

    print(f"\nstamped {sum(len(v) for v in by_layer.values())} instances across {len(assembly['layers'])} layers")
    return 0


if __name__ == "__main__":
    sys.exit(main())
