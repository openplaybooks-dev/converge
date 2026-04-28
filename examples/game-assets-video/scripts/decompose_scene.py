#!/usr/bin/env python3
"""decompose_scene.py — Decompose a scene into a structured plan JSON.

Reads:
  - assets/concept/style-sheet.png       (universal style anchor)
  - assets/scenes/{id}/concept.png       (scene-specific anchor)
  - assets/scenes/{id}/extracted/bg-{far,mid,near}.png  (per-layer slices)
  - assets/scenes.json[scene_entry]      (declared scene config)
  - assets/catalog.json                  (canonical prop animation_type)

Writes:
  - assets/scenes/{id}/scene-plan.json — per-layer regions + palette;
    tilesheet adjacency + per-tile edges; scene_props with animation_type.

Every downstream per-asset spec script reads its slice from scene-plan.json
so generation tasks receive a focused, fully-contextualized prompt.

Cost: 1 text-out call (~5¢ on Gemini).

Usage:
  python scripts/decompose_scene.py <scene_id> [--force]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from pathlib import Path

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


VALID_ANIMATION_TYPES = ["static", "loop", "trigger"]


def load_scene_entry(project_root: Path, scene_id: str) -> dict:
    scenes_path = project_root / "assets" / "scenes.json"
    if not scenes_path.exists():
        raise SystemExit(f"{scenes_path} not found")
    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    for s in scenes:
        if s.get("id") == scene_id:
            return s
    raise SystemExit(f"scene {scene_id!r} not found in scenes.json")


def load_catalog(project_root: Path) -> dict:
    p = project_root / "assets" / "catalog.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {}


def build_prompt(scene: dict, catalog: dict) -> str:
    sid = scene.get("id")
    biome = scene.get("biome", "")
    desc = scene.get("description", "")
    bg = scene.get("background") or {}
    layers = bg.get("layers") or []
    tilemap = scene.get("tilemap") or {}
    tile_variants = tilemap.get("tile_variants") or []
    grid = tilemap.get("sheet_grid") or [4, 4]
    tile_size_px = tilemap.get("working_resolution", 128)
    scene_props = scene.get("scene_props") or []
    catalog_props = catalog.get("shared_props") or []

    return textwrap.dedent(f"""\
        You are decomposing a 2D game SCENE into a structured plan JSON.
        Downstream per-layer / per-tile / per-prop generators will read
        their slice from this plan, so each entry must be specific enough
        to drive ONE focused image-gen call without further interpretation.

        Scene id: {sid}
        Biome: {biome}
        Description:
        {desc}

        Declared bg layers (from scenes.json):
        ```json
        {json.dumps(layers, indent=2)}
        ```

        Declared tilemap (from scenes.json):
        - grid: {grid}
        - tile_size_px (working): {tile_size_px}
        - tile_variants:
        ```json
        {json.dumps(tile_variants, indent=2)}
        ```

        Declared scene props (from scenes.json):
        ```json
        {json.dumps(scene_props, indent=2)}
        ```

        Shared props in catalog (animation_type already canonical):
        ```json
        {json.dumps(catalog_props, indent=2)}
        ```

        Inputs available as IMAGES attached to this prompt (for visual reference):
          1. assets/concept/style-sheet.png — universal style anchor
          2. assets/scenes/{sid}/concept.png — this scene's hero shot
          3. assets/scenes/{sid}/extracted/bg-far.png — far layer slice (if present)
          4. assets/scenes/{sid}/extracted/bg-mid.png — mid layer slice (if present)
          5. assets/scenes/{sid}/extracted/bg-near.png — near layer slice (if present)

        Output ONE JSON object, in this schema:

        ```json
        {{
          "bg": {{
            "layers": [
              {{
                "id": "<far|mid|near>",
                "target_size": [2048, 1152],
                "transparent": false,
                "blend_with_above": null,
                "subject_height_tiles": null,
                "regions": [
                  {{ "x_norm": [0.0, 0.5], "content": "<short description of left half — what the model should draw there>" }},
                  {{ "x_norm": [0.5, 1.0], "content": "<short description of right half>" }}
                ],
                "palette": "<palette description specific to this layer, e.g. 'warm cream sky, hazy blue-green hills'>",
                "extend": null
              }}
            ]
          }},
          "tilesheet": {{
            "grid": [4, 4],
            "tile_size_px": {tile_size_px},
            "shared_palette": "<one palette description for all tiles in the sheet>",
            "tiles": [
              {{
                "id": "<from declared tile_variants[].id>",
                "cell": [<row>, <col>],
                "neighbors": {{ "top": "<id or 'sky'>", "bottom": "<id or 'earth'>", "left": "<id>", "right": "<id>" }},
                "edges": "<one sentence on edge content so left/right cells abut seamlessly>",
                "description": "<from declared tile_variants[].description, possibly enriched>"
              }}
            ]
          }},
          "scene_props": [
            {{
              "id": "<from declared scene_props[].id>",
              "animation_type": "static | loop | trigger",
              "keyframes_id": "<one of the catalog known cycles, or null>",
              "scale_relative_to_hero": 0.4,
              "palette": "<short palette tied to the scene>",
              "description": "<one sentence>"
            }}
          ]
        }}
        ```

        Rules:
        - Every layer MUST have at least one region; longer layers can have 2-3.
        - blend_with_above is the layer id immediately further (e.g. mid blends with far).
          Far layer's blend_with_above is null.
        - target_size: 2048x1152 default; if the layer needs more horizontal space,
          set "extend" to {{ "left_px": <int>, "right_px": <int> }} so the extend task knows.
        - Tilesheet: grid order is row-major. Cell [0,0] is top-left.
        - For a "grass-base" tile next to a "grass-edge-right" tile, the right edge
          of grass-base must visually MATCH the left edge of grass-edge-right.
        - scene_props animation_type rules: same as catalog (static / loop / trigger).
        - Use ONLY the tile ids and prop ids declared in the inputs above — do not invent new ones.
        - Use only the layer ids that appear in the declared layers array.

        Respond with ONLY the JSON code block. No commentary.
    """).strip()


def parse_plan(text: str) -> dict:
    s = text.strip()
    fence = re.search(r"```(?:json)?\s*\n(.*?)\n```", s, re.S)
    if fence:
        s = fence.group(1).strip()
    brace = re.search(r"\{.*\}", s, re.S)
    if brace:
        s = brace.group(0)
    try:
        return json.loads(s)
    except Exception as exc:
        raise SystemExit(
            f"decompose_scene returned unparseable JSON: {exc}\n--- raw ---\n{text}"
        ) from exc


def validate_plan(plan: dict, scene: dict) -> None:
    bg = plan.get("bg") or {}
    layers = bg.get("layers") or []
    if not layers:
        raise SystemExit("plan.bg.layers is empty")
    declared_layer_ids = {l.get("id") for l in (scene.get("background", {}).get("layers") or [])}
    for layer in layers:
        if layer.get("id") not in declared_layer_ids:
            raise SystemExit(
                f"plan declares layer {layer.get('id')!r} that's not in scenes.json"
            )
        regs = layer.get("regions") or []
        if not regs:
            raise SystemExit(f"plan layer {layer.get('id')!r} has no regions")
    for prop in plan.get("scene_props") or []:
        atype = prop.get("animation_type")
        if atype not in VALID_ANIMATION_TYPES:
            raise SystemExit(
                f"scene prop {prop.get('id')!r}: animation_type {atype!r} "
                f"not in {VALID_ANIMATION_TYPES}"
            )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene = load_scene_entry(project_root, args.scene_id)
    catalog = load_catalog(project_root)

    out_path = project_root / "assets" / "scenes" / args.scene_id / "scene-plan.json"
    if out_path.exists() and not args.force:
        sys.stderr.write(
            f"  scene-plan.json already exists at {out_path.relative_to(project_root)} — "
            f"pass --force to regenerate\n"
        )
        return 0

    image_paths: list[Path] = []
    for rel in (
        "assets/concept/style-sheet.png",
        f"assets/scenes/{args.scene_id}/concept.png",
        f"assets/scenes/{args.scene_id}/extracted/bg-far.png",
        f"assets/scenes/{args.scene_id}/extracted/bg-mid.png",
        f"assets/scenes/{args.scene_id}/extracted/bg-near.png",
    ):
        p = project_root / rel
        if p.exists():
            image_paths.append(p)

    prompt = build_prompt(scene, catalog)

    backend = active_backend()
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[scene-plan {args.scene_id}] backend={backend} cost={cost}c "
        f"refs={len(image_paths)}\n"
    )

    with budget.charged(
        project_root, cost, f"text-{backend}",
        note=f"decompose-scene-{args.scene_id}",
    ):
        text = generate_text_from_image(prompt, image_paths=image_paths)

    raw_path = out_path.parent / "scene-plan.raw.txt"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(text, encoding="utf-8")

    plan = parse_plan(text)
    validate_plan(plan, scene)
    out_path.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")

    sys.stderr.write(
        f"  wrote {out_path.relative_to(project_root)} "
        f"(layers={len(plan.get('bg', {}).get('layers', []))}, "
        f"tiles={len(plan.get('tilesheet', {}).get('tiles', []))}, "
        f"scene_props={len(plan.get('scene_props', []))})\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
