#!/usr/bin/env python3
"""extract_bg_manifest.py — Vision-pass JSON manifest of layer attributes.

Looks at the scene concept and produces a structured JSON describing each
parallax layer's palette, subject height in tiles, feature density, plus
tiles and scene-props visible. Consumed by downstream tasks (background
generators, tilemap, scene-plan) for sizing and prompt context.

Reads:
  - assets/scenes/{scene_id}/concept.png      (scene anchor)
  - assets/scenes.json[scene_id]              (declared tiles/props vocab)

Writes:
  - assets/scenes/{scene_id}/extracted/manifest.json
  - assets/scenes/{scene_id}/extracted/manifest.prompt.txt
  - assets/scenes/{scene_id}/extracted/manifest.raw.txt

Also (best-effort) merges per-layer subject_height_tiles + extracted_layer_path
into the scene's `background.layers[]` in scenes.json so downstream tools
inherit the depths the model measured.

Usage:
  python scripts/extract_bg_manifest.py <scene_id>
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


def load_scene(project_root: Path, scene_id: str) -> dict:
    p = project_root / "assets" / "scenes.json"
    if not p.exists():
        raise SystemExit(f"{p} not found")
    for s in json.loads(p.read_text(encoding="utf-8")):
        if s.get("id") == scene_id:
            return s
    raise SystemExit(f"scene {scene_id!r} not found in {p}")


def parse_json_from_text(text: str) -> dict:
    s = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*\n(.*?)\n```", s, re.S)
    if fence:
        s = fence.group(1).strip()
    brace = re.search(r"\{.*\}", s, re.S)
    if brace:
        s = brace.group(0)
    try:
        return json.loads(s)
    except Exception:
        return {}


def build_manifest_prompt(scene: dict) -> str:
    name = scene.get("name", scene.get("id", ""))
    biome = scene.get("biome", "")
    tiles = [v.get("id") for v in scene.get("tilemap", {}).get("tile_variants", []) if v.get("id")]
    props = [p.get("id") for p in scene.get("scene_props", []) if p.get("id")]
    declared_layers = [l.get("id") if isinstance(l, dict) else l
                       for l in (scene.get("background") or {}).get("layers", [])]
    return f"""\
You are looking at the concept image for a 2D platformer scene called
"{name}" (biome: {biome}). The game uses one canonical unit: 1 TILE
= 16 in-game pixels. The hero character is approximately 1.5 tiles tall.

Output ONE compact JSON object describing the visible composition. Use
the schema below EXACTLY. Don't add prose, don't add other top-level keys.

```json
{{
  "layers": {{
    "far":  {{ "subject_height_tiles": <number>, "palette": ["#RRGGBB", ...], "feature_density": "low|medium|high", "notes": "<1 sentence>" }},
    "mid":  {{ "subject_height_tiles": <number>, "palette": [...],         "feature_density": "...", "notes": "..." }},
    "near": {{ "subject_height_tiles": <number>, "palette": [...],         "feature_density": "...", "notes": "..." }}
  }},
  "tiles_visible":       ["<tile_id>", ...],
  "scene_props_visible": ["<prop_id>", ...]
}}
```

`subject_height_tiles` for each layer is the height (in tiles) of the
DOMINANT VISIBLE SUBJECT in that layer (e.g., the tallest tree or
silhouette). Use the hero's 1.5-tile height as the anchor — measure
heights relative to a hero-sized figure standing on the ground. A typical
distribution: far=1.0–2.0, mid=2.5–4.5, near=5.0–9.0.

`palette` is up to 5 dominant hex colors picked DIRECTLY from the layer's
pixels (no invented colors). Use #RRGGBB.

`feature_density`: how packed is each layer? "low" = sparse silhouettes,
"medium" = readable shapes spaced apart, "high" = tightly packed details.

`tiles_visible` and `scene_props_visible`: only ID slugs you can confidently
infer (e.g., "grass-base", "mushroom-red", "torch", "fern-cluster"). Skip
ambiguous things. Empty array is fine.

Constraints from this scene's manifest (use as a vocabulary hint, not a
checklist — you can return a subset):
  - Declared layers: {", ".join(declared_layers) if declared_layers else "(none)"}
  - Declared tile variants: {", ".join(tiles) if tiles else "(none)"}
  - Declared scene_props: {", ".join(props) if props else "(none)"}

Respond with ONLY the JSON code block, no commentary.
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene = load_scene(project_root, args.scene_id)
    scene_dir = project_root / "assets" / "scenes" / args.scene_id
    concept_path = scene_dir / "concept.png"
    if not concept_path.exists():
        raise SystemExit(f"{concept_path} not found")
    out_dir = scene_dir / "extracted"
    out_dir.mkdir(parents=True, exist_ok=True)

    prompt = build_manifest_prompt(scene)
    (out_dir / "manifest.prompt.txt").write_text(prompt, encoding="utf-8")

    backend = active_backend()
    cost = budget.cost_for_image(backend)  # text-out priced as image equivalent
    sys.stderr.write(
        f"[extract-manifest {args.scene_id}] backend={backend} cost={cost}c\n"
    )
    with budget.charged(
        project_root, cost, f"text-{backend}",
        note=f"extract-{args.scene_id}/manifest",
    ):
        text = generate_text_from_image(prompt, image_paths=[concept_path])

    (out_dir / "manifest.raw.txt").write_text(text or "", encoding="utf-8")
    parsed = parse_json_from_text(text or "")
    if not parsed:
        sys.stderr.write(
            "  ⚠ manifest JSON parse failed — saving stub so downstream doesn't crash\n"
        )
        parsed = {
            "layers": {
                "far":  {"subject_height_tiles": 1.5, "palette": [], "feature_density": "unknown", "notes": ""},
                "mid":  {"subject_height_tiles": 3.5, "palette": [], "feature_density": "unknown", "notes": ""},
                "near": {"subject_height_tiles": 6.0, "palette": [], "feature_density": "unknown", "notes": ""},
            },
            "tiles_visible": [],
            "scene_props_visible": [],
            "_parse_failed": True,
        }
    (out_dir / "manifest.json").write_text(json.dumps(parsed, indent=2), encoding="utf-8")

    # Best-effort merge into scenes.json so downstream tasks inherit
    # subject_height_tiles + extracted_layer_path. Preserves user-set values.
    scenes_path = project_root / "assets" / "scenes.json"
    try:
        scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    except Exception:
        scenes = []
    target = None
    for s in scenes:
        if s.get("id") == args.scene_id:
            target = s
            break
    if target is not None:
        bg = target.setdefault("background", {})
        layers = bg.setdefault("layers", [])
        # Index by id so we update by name, not position.
        by_id = {l.get("id"): l for l in layers if isinstance(l, dict)}
        for lid, lcfg in (parsed.get("layers") or {}).items():
            entry = by_id.get(lid)
            if entry is None:
                entry = {"id": lid, "transparent": lid != "far",
                         "transition_below": None, "use_extraction": True}
                layers.append(entry)
                by_id[lid] = entry
            if entry.get("subject_height_tiles") in (None, 0):
                sh = lcfg.get("subject_height_tiles")
                if isinstance(sh, (int, float)):
                    entry["subject_height_tiles"] = sh
            entry["extracted_layer_path"] = (
                f"assets/scenes/{args.scene_id}/extracted/bg-{lid}.png"
            )
            entry.setdefault("use_extraction", True)
        scenes_path.write_text(json.dumps(scenes, indent=2), encoding="utf-8")
        sys.stderr.write(
            f"  merged manifest layer info into scenes.json[{args.scene_id}]\n"
        )

    sys.stderr.write(
        f"  wrote {(out_dir / 'manifest.json').relative_to(project_root)}\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
