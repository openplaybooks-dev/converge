#!/usr/bin/env python3
"""layer_paint.py — image-edit each layer's visual map into a finished concept.

For each layer in `scene.assembly.json`, takes the stamped visual map
(`maps/{layer_id}.png` — produced by `scene_stamp.py`) as the
image-edit input, attaches the project style anchor + visual target as
supporting references, and runs image-gen.

Output: `assets/scenes/{scene_id}/layers/{layer_id}.png` — the finished
painted layer at concept resolution.

Layer roles drive the prompt: each role has a default prompt template
that explains to the painter what "edit this map" means in context
(atmosphere = paint sky/mountains, silhouette = paint mid-distance
forms, gameplay = paint ground/water/platforms with footprints honored).

Layers are painted **back-to-front**, with each previous layer's output
attached as an additional reference so cross-layer color/lighting stays
consistent.

Usage:
  python scripts/layer_paint.py <scene_id>
  python scripts/layer_paint.py <scene_id> --only play     # one layer
  python scripts/layer_paint.py <scene_id> --dry-run       # write prompts only, no image-gen
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from tokens_compile import find_project_root
from lib import budget
from lib.image_api import generate_image_with_edit
from lib.style_anchor import style_sheet_path


# Per-role prompt templates. The {tokens} placeholder is filled with a
# bullet list of the tokens placed in this layer (id + art_notes).
ROLE_PROMPTS: dict[str, str] = {
    "bg-far": """\
You are painting the FAR BACKGROUND layer of a 2D side-scrolling scene.

The input image is a SCHEMATIC visual map showing where atmospheric
elements should sit. The shapes are placeholders — paint OVER them with
finished art. Honor positions and outer silhouettes within ±5%, but
replace flat fills with painterly atmospheric content (hazy mountains,
soft sky gradients, distant clouds).

Style references (image #2 = style-sheet, image #3 = visual-target)
define the project's binding visual identity. Match palette, brushwork,
saturation, line weight exactly.

This is the BACK-MOST layer — fully opaque, fills the whole canvas.
Areas of the input that are transparent should become painted SKY in
the style of the references. Distant mountain silhouettes in the input
should become hazy painted mountains in the same x-positions.

Tokens placed in this layer:
{tokens}

Output: one image at exactly {canvas_w}x{canvas_h} px, fully opaque,
no transparent regions, no text/UI/characters.
""",

    "bg-mid": """\
You are painting the MID-DISTANCE layer of a 2D side-scrolling scene.

The input image is a SCHEMATIC visual map showing where mid-distance
elements (tree clusters, hills, distant ruins) should sit. Areas with
content are painted hints; areas without content (transparent) are
where the FAR layer behind shows through.

Honor positions of every element within ±5%. Replace the flat colored
silhouettes with painterly mid-distance forms — softer detail than the
foreground but more readable than the far background. Trees should
read as tree-shaped masses with subtle trunk + canopy structure;
hills as rolling silhouettes with rim light from the lighting
direction.

Style references (image #2 = style-sheet, image #3 = visual-target,
image #4 = the previously-painted FAR layer for color consistency)
define the visual identity. Match the palette and atmospheric haze of
the FAR layer reference where the mid layer recedes into distance.

This layer is TRANSPARENT — keep alpha where the input is transparent.
Mid-distance elements should sit on top of the far layer when
composited.

Tokens placed in this layer:
{tokens}

Output: one image at exactly {canvas_w}x{canvas_h} px, RGBA, with
transparency preserved where the input is transparent.
""",

    "play": """\
You are painting the GAMEPLAY layer of a 2D side-scrolling scene.

The input image is a SCHEMATIC visual map showing the playable
terrain — ground bands, water, platforms, hazards, gameplay markers.
Every element's position is GAMEPLAY-CRITICAL: the player walks on
these surfaces, falls into these water pits, lands on these platforms.
Honor positions and outer footprints within ±3% (tighter than other
layers — this is collision-relevant).

Replace the flat colored fills with finished painted art:
- Ground rectangles → painted earth with grass blades on top, packed
  dirt below, soft variation
- Water rectangles → painted ponds with shoreline transitions, lily
  pads, calm reflective surface
- Platform rectangles → painted floating ledges with grass-topped
  lips and visible plank structure
- Markers (small circles, e.g. spawn/exit) → leave them visible only
  as subtle light cues OR omit entirely; they're gameplay metadata,
  not visuals

Style references (image #2 = style-sheet, image #3 = visual-target,
image #4+ = previously-painted layers behind this one) define the
visual identity. The play layer is the SHARPEST and most saturated;
foreground forms read crisply.

This layer is TRANSPARENT above the gameplay band — keep alpha where
the input is transparent so the bg layers show through above the
horizon line.

Tokens placed in this layer:
{tokens}

Output: one image at exactly {canvas_w}x{canvas_h} px, RGBA, with
transparency preserved where the input is transparent.
""",

    "fg": """\
You are painting the FOREGROUND FRAME layer of a 2D side-scrolling
scene.

The input image is a SCHEMATIC visual map showing foreground elements
(branches, vines, columns, blurred grass) that frame the camera.
These elements sit IN FRONT OF the player — the camera looks past
them; they should read as near-silhouette with slight focus blur.

Honor positions within ±5%. Use a DARKER, less saturated palette than
the play layer (the foreground is in the camera's near depth-of-field;
it should feel slightly out of focus).

Style references (image #2 = style-sheet, image #3 = visual-target,
image #4+ = previously-painted layers behind this one).

This layer is TRANSPARENT — keep alpha where the input is transparent
so the player and play layer remain visible.

Tokens placed in this layer:
{tokens}

Output: one image at exactly {canvas_w}x{canvas_h} px, RGBA, with
transparency preserved where the input is transparent.
""",
}

ROLE_FOR_LAYER = {
    "bg-far": "bg-far",
    "bg-mid": "bg-mid",
    "play":   "play",
    "fg":     "fg",
}


def render_token_list(layer_id: str, assembly: dict, tokens: dict) -> str:
    lines: list[str] = []
    for inst in assembly["tokens"]:
        if inst["layer"] != layer_id:
            continue
        token = tokens[inst["token"]]
        ax, ay = inst["at"]
        bw, bh = token["footprint"]
        notes = (token.get("visual") or {}).get("art_notes", "").strip().replace("\n", " ")
        lines.append(
            f"  - {token['id']:<22} at_tile=({ax},{ay}) footprint={bw}x{bh}"
            + (f" — {notes}" if notes else "")
        )
    return "\n".join(lines) if lines else "  (no tokens in this layer)"


def paint_layer(
    *,
    project_root: Path,
    scene_dir: Path,
    layer_id: str,
    assembly: dict,
    tokens: dict,
    style_anchor: Path | None,
    visual_target: Path | None,
    previous_layers: list[Path],
    dry_run: bool,
) -> Path:
    """Generate one finished layer PNG by image-editing the stamped map."""
    map_png = scene_dir / "maps" / f"{layer_id}.png"
    if not map_png.exists():
        raise FileNotFoundError(f"{map_png} not found — run scripts/scene_stamp.py first")

    canvas_w, canvas_h = assembly["canvas"]["grid_size"]
    canvas_w *= int(assembly["canvas"]["concept_tile_px"])
    canvas_h *= int(assembly["canvas"]["concept_tile_px"])

    role = ROLE_FOR_LAYER.get(layer_id, "play")
    template = ROLE_PROMPTS[role]
    prompt = template.format(
        canvas_w=canvas_w,
        canvas_h=canvas_h,
        tokens=render_token_list(layer_id, assembly, tokens),
    )

    layers_dir = scene_dir / "layers"
    layers_dir.mkdir(parents=True, exist_ok=True)
    out_png = layers_dir / f"{layer_id}.png"
    prompt_path = layers_dir / f"{layer_id}.prompt.txt"
    prompt_path.write_text(prompt, encoding="utf-8")

    if dry_run:
        print(f"  {layer_id}: prompt → {prompt_path.name} (dry-run; no image-gen)")
        return out_png

    refs: list[Path] = []
    if style_anchor and style_anchor.exists():
        refs.append(style_anchor)
    if visual_target and visual_target.exists():
        refs.append(visual_target)
    refs.extend(previous_layers)

    cost_cents = 5
    with budget.charged(
        category="layer-paint",
        scene_id=assembly["scene_id"],
        layer_id=layer_id,
        cost_cents=cost_cents,
    ):
        result = generate_image_with_edit(
            prompt=prompt,
            base_image_path=map_png,
            reference_paths=refs or None,
        )
        out_bytes = result["image_bytes"]
        seed = result.get("seed")
        out_png.write_bytes(out_bytes)
        if seed is not None:
            (layers_dir / f"{layer_id}.seed.txt").write_text(str(seed), encoding="utf-8")

    print(f"  {layer_id}: painted → {out_png.name}")
    return out_png


def main() -> int:
    p = argparse.ArgumentParser(description="Image-edit each layer's visual map → finished concept")
    p.add_argument("scene_id")
    p.add_argument("--only", help="paint only this layer id")
    p.add_argument("--dry-run", action="store_true", help="write prompts but skip image-gen")
    args = p.parse_args()

    project_root = find_project_root()
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    assembly_path = scene_dir / "scene.assembly.json"
    if not assembly_path.exists():
        print(f"error: {assembly_path} not found", file=sys.stderr)
        return 1
    assembly = json.loads(assembly_path.read_text(encoding="utf-8"))

    biome = assembly["biome"]
    biome_dir = project_root / "assets" / "tokens" / biome
    tokens: dict[str, dict] = {}
    # Per-asset folder layout: each token's compiled JSON sits at
    # `{category}/{token-id}/token.json`.
    for js in biome_dir.rglob("token.json"):
        data = json.loads(js.read_text(encoding="utf-8"))
        tokens[data["id"]] = data

    style_anchor = style_sheet_path(project_root)
    visual_target = project_root / "assets" / "visual-target.png"

    layers_to_paint = (
        [layer for layer in assembly["layers"] if layer["id"] == args.only]
        if args.only
        else assembly["layers"]
    )
    if not layers_to_paint:
        print(f"error: no layers matched (--only={args.only!r})", file=sys.stderr)
        return 1

    previous_layers: list[Path] = []
    for layer in layers_to_paint:
        layer_id = layer["id"]
        out = paint_layer(
            project_root=project_root,
            scene_dir=scene_dir,
            layer_id=layer_id,
            assembly=assembly,
            tokens=tokens,
            style_anchor=style_anchor,
            visual_target=visual_target,
            previous_layers=list(previous_layers),
            dry_run=args.dry_run,
        )
        if not args.dry_run and out.exists():
            previous_layers.append(out)

    return 0


if __name__ == "__main__":
    sys.exit(main())
