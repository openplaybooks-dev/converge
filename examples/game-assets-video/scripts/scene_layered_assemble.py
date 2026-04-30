#!/usr/bin/env python3
"""scene_layered_assemble.py — composite painted layers into scene.png.

Reads scene.assembly.json + layers/{layer_id}.png (one per layer
declared in the assembly), composites them back-to-front in layer
order, and writes scene.png + scene.json (engine manifest).

Usage:
  python scripts/scene_layered_assemble.py <scene_id>
  python scripts/scene_layered_assemble.py <scene_id> --resolution gameplay
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

from tokens_compile import find_project_root


LANDSCAPE_EXCLUDED_LAYERS = {"fg"}


def composite_layers(
    assembly: dict,
    scene_dir: Path,
    *,
    resolution: str = "concept",
    variant: str = "scene",
) -> Image.Image:
    """Composite painted layers into a single image.

    `variant` controls which per-layer file to read for each layer:
      - "scene"      → layers/{layer}.png (the default, includes dynamic
                       elements as painted)
      - "landscape"  → maps/{layer}.landscape.png if it exists (no
                       kind=dynamic tokens), else falls back to
                       layers/{layer}.png. Used to produce a static-only
                       composite for preview / promotional crops. Also
                       skips any layer in LANDSCAPE_EXCLUDED_LAYERS — the
                       `fg` layer is a near-camera frame (vines, branches
                       hanging into shot) and is not part of the static
                       landscape; it would intrude on a preview crop.
    """
    grid_w, grid_h = assembly["canvas"]["grid_size"]
    tile_px = int(assembly["canvas"]["tile_size_px"])
    concept_px = int(assembly["canvas"]["concept_tile_px"])

    if resolution == "gameplay":
        target_w, target_h = grid_w * tile_px, grid_h * tile_px
    elif resolution == "concept":
        target_w, target_h = grid_w * concept_px, grid_h * concept_px
    else:
        raise ValueError(f"resolution must be 'gameplay' or 'concept', got {resolution!r}")

    if variant not in ("scene", "landscape"):
        raise ValueError(f"variant must be 'scene' or 'landscape', got {variant!r}")

    out = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    composited = 0
    for layer in assembly["layers"]:
        layer_id = layer["id"]

        if variant == "landscape" and layer_id in LANDSCAPE_EXCLUDED_LAYERS:
            print(f"  skip {layer_id}: excluded from landscape variant")
            continue

        layer_path: Path | None = None
        if variant == "landscape":
            landscape_map = scene_dir / "maps" / f"{layer_id}.landscape.png"
            if landscape_map.exists():
                layer_path = landscape_map

        if layer_path is None:
            painted = scene_dir / "layers" / f"{layer_id}.png"
            if painted.exists():
                layer_path = painted

        if layer_path is None:
            print(f"  skip {layer_id}: no source found for variant={variant}", file=sys.stderr)
            continue

        img = Image.open(layer_path).convert("RGBA")
        if img.size != (target_w, target_h):
            img = img.resize((target_w, target_h), Image.LANCZOS)
        out.alpha_composite(img)
        composited += 1
        print(f"  composited {layer_id} (depth={layer['depth']}) ← {layer_path.name}")

    if composited == 0:
        raise RuntimeError(
            f"no layers composited (variant={variant}) — run scripts/layer_paint.py "
            "or scripts/scene_stamp.py first"
        )
    return out


def build_scene_json(assembly: dict) -> dict:
    grid_w, grid_h = assembly["canvas"]["grid_size"]
    tile_px = int(assembly["canvas"]["tile_size_px"])

    beats: list[dict] = []
    for inst in assembly["tokens"]:
        # We need token.gameplay.beats to know if this token contributes a beat;
        # since we don't load the tokens library here, defer beats to a future
        # enrichment pass. For now record block instances only.
        pass

    return {
        "scene_id": assembly["scene_id"],
        "biome": assembly["biome"],
        "grid_size": [grid_w, grid_h],
        "tile_size_px": tile_px,
        "world": {"width_px": grid_w * tile_px, "height_px": grid_h * tile_px},
        "layers": [
            {"id": layer["id"], "depth": layer["depth"], "file": f"layers/{layer['id']}.png"}
            for layer in assembly["layers"]
        ],
        "files": {"scene": "scene.png", "assembly": "scene.assembly.json"},
        "block_instances": [
            {"token": inst["token"], "at": inst["at"], "layer": inst["layer"]}
            for inst in assembly["tokens"]
        ],
    }


def main() -> int:
    p = argparse.ArgumentParser(description="Composite painted layers → scene.png + landscape.png")
    p.add_argument("scene_id")
    p.add_argument("--resolution", choices=("gameplay", "concept"), default="concept")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    assembly_path = scene_dir / "scene.assembly.json"
    if not assembly_path.exists():
        print(f"error: {assembly_path} not found", file=sys.stderr)
        return 1
    assembly = json.loads(assembly_path.read_text(encoding="utf-8"))

    img = composite_layers(assembly, scene_dir, resolution=args.resolution, variant="scene")
    out_png = scene_dir / "scene.png"
    img.save(out_png)
    print(f"wrote {out_png} ({img.size[0]}x{img.size[1]})")

    out_json = scene_dir / "scene.json"
    out_json.write_text(json.dumps(build_scene_json(assembly), indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out_json}")

    # Landscape variant: same composite minus dynamic tokens. Used by
    # 04-preview as a static reference for AI-painting the first window.
    layers_dir = scene_dir / "layers"
    layers_dir.mkdir(parents=True, exist_ok=True)
    landscape_img = composite_layers(
        assembly, scene_dir, resolution=args.resolution, variant="landscape"
    )
    landscape_png = layers_dir / "landscape.png"
    landscape_img.save(landscape_png)
    print(f"wrote {landscape_png} ({landscape_img.size[0]}x{landscape_img.size[1]})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
