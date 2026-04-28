#!/usr/bin/env python3
"""extract_concept_layers.py — Vision-pass extraction of parallax layers from concept.png.

Flips the relationship between concept.png and the asset library: instead of
treating concept.png as a vague style reference for downstream generators,
this script makes it the **literal source of truth**. For each parallax layer
declared in scenes.json[<scene>].background.layers, we ask the model to
output the same image with everything OUTSIDE that layer replaced by pure
chroma-green (#00FF00). The chroma-key pipeline then converts the green
to alpha=0, leaving a per-layer PNG that is a faithful slice of the concept.

Those extracted PNGs become the **segment-1 seed** for
generate_scene_background.py — meaning the leftmost screen-width of every
wide bg map is pixel-identical to what the user saw in the concept image.
Subsequent segments extend that content rightward via the existing stitching
pipeline.

A second pass (text-out, JSON) reads the same concept and emits per-layer
metadata (palette, subject_height_tiles, feature density). This metadata
is merged back into scenes.json so downstream prompts inherit visually-
grounded sizing instead of guessing.

Cost: ~20¢ / scene (3 image-gen + 1 text-out).
Reuses:
  - lib.image_api.generate_image_with_edit             (per-layer extraction)
  - lib.image_api_gemini.generate_text_from_image      (manifest extraction)
  - lib.stitch.chroma_green_to_alpha                   (green → alpha)
  - lib.budget.charged                                  (pre-spend gate + refund)

Outputs:
  assets/scenes/<scene>/extracted/bg-<layer>.png       per-layer alpha-keyed PNG
  assets/scenes/<scene>/extracted/bg-<layer>.prompt.txt (debug sidecar)
  assets/scenes/<scene>/extracted/manifest.json        per-asset SPEC + sizes
  scenes.json[<scene>].background.layers[].extracted_layer_path
                                                       (in-place enrichment)
  scenes.json[<scene>].background.layers[].subject_height_tiles
                                                       (filled from extracted manifest
                                                        if user didn't already set)

Usage:
  python scripts/extract_concept_layers.py <scene_id>
  python scripts/extract_concept_layers.py <scene_id> --layers far,mid
  python scripts/extract_concept_layers.py <scene_id> --force
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import textwrap
from pathlib import Path

from PIL import Image

from lib import budget, stitch
from lib.image_api import active_backend, generate_image_with_edit
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


def load_scenes(project_root: Path) -> list[dict]:
    p = project_root / "assets" / "scenes.json"
    if not p.exists():
        raise SystemExit(f"{p} not found")
    return json.loads(p.read_text(encoding="utf-8"))


def save_scenes(project_root: Path, scenes: list[dict]) -> None:
    p = project_root / "assets" / "scenes.json"
    p.write_text(json.dumps(scenes, indent=2), encoding="utf-8")


def normalize_layer_cfg(entry: str | dict) -> dict:
    """Accept both legacy ['far','mid','near'] and structured-object shape."""
    if isinstance(entry, str):
        return {"id": entry, "transparent": True, "transition_below": None,
                "subject_height_tiles": None, "extracted_layer_path": None,
                "use_extraction": True}
    return {
        "id": entry["id"],
        "transparent": bool(entry.get("transparent", False)),
        "transition_below": entry.get("transition_below"),
        "subject_height_tiles": entry.get("subject_height_tiles"),
        "extracted_layer_path": entry.get("extracted_layer_path"),
        "use_extraction": entry.get("use_extraction", True),
    }


# ── Layer-extraction prompt ────────────────────────────────────────────────

LAYER_PROMPT_TEMPLATE = """\
You are given an existing painterly gameplay concept image. Output the
SAME image, same dimensions, same composition, same painterly style — but
keep ONLY the {LAYER_NAME_UPPER} parallax layer's content, and replace
EVERY OTHER pixel with pure chroma-green (#00FF00, RGB 0/255/0).

LAYER YOU ARE EXTRACTING ({LAYER_NAME_UPPER}):
{LAYER_DEFINITION}

WHAT TO ERASE (replace with #00FF00):
{LAYER_EXCLUSIONS}

UNIVERSAL EXCLUSIONS (always replace with #00FF00, never kept):
  - The PLAYER CHARACTER, hero, or any human/humanoid figure.
  - Any character armor, weapon, cape, sword, shield, or held item.
  - UI elements, text, labels, captions, watermarks.
  - Any prop the player can pick up (potions, keys, coins).

CRITICAL RULES:
  1. Do NOT redraw or reinterpret the kept content. Preserve the original
     pixels of the {LAYER_NAME} layer as faithfully as possible — same
     palette, same silhouettes, same brush strokes. We want a SURGICAL
     CUT, not a re-imagining.
  2. EVERY pixel that is NOT part of the {LAYER_NAME} layer must be
     #00FF00 (pure green). The output will be chroma-keyed; non-green
     pixels appear opaque in the final layer.
  3. If the {LAYER_NAME} layer in the original is sparse, the output
     should be MOSTLY green. A nearly-empty output with just the kept
     band is correct.
  4. Output the SAME ASPECT RATIO and approximately same resolution as
     the input image.

DEPTH ORDERING (top to bottom of canvas):
  - FAR is the topmost band (sky / mountain silhouettes). Painterly,
    desaturated, hazy. NEVER includes the player or foreground content.
  - MID is the middle band (trees / structures at the player's depth
    level). NEVER includes the sky above OR the immediate foreground
    grass/rocks below.
  - NEAR is the bottommost band (foreground grass tufts, ground rocks,
    immediate detail). NEVER includes the trees in the middle distance.

The three layers are MUTUALLY EXCLUSIVE — every non-character pixel
belongs to exactly one of them. When you extract one, the other two
are erased.
"""

LAYER_DEFINITIONS = {
    "far": (
        "Sky, clouds, distant mountain or hill silhouettes, far-distance tree "
        "lines / cityscape silhouettes that read as 'horizon haze'. Anything "
        "blurry and desaturated. Top portion of the canvas only — typically "
        "the upper third or upper half."
    ),
    "mid": (
        "Middle-depth trees, bushes, structures — the band between the sky "
        "and the player's walking ground. Full saturation, readable shape, "
        "but NOT the closest detail. Vertically: the middle band of the "
        "canvas, sitting on top of the foreground but in front of the sky."
    ),
    "near": (
        "Foreground only — grass tufts, ground-level rocks, ferns, fallen "
        "leaves, the very nearest tree trunks the player would walk past. "
        "Bottommost band of the canvas. Highest detail, most saturated."
    ),
}

LAYER_EXCLUSIONS = {
    "far": (
        "ERASE: any tree the player can walk past, any grass on the ground, "
        "any rock or prop in the foreground, the player character, the dirt "
        "path, near or middle-distance foliage. Keep only sky and the most "
        "distant horizon silhouettes."
    ),
    "mid": (
        "ERASE: the sky / horizon above (that's the FAR layer), the "
        "foreground grass / rocks / ferns below (that's the NEAR layer), "
        "and the player character. Keep only middle-distance trees / bushes "
        "and the band where they meet the ground."
    ),
    "near": (
        "ERASE: the sky above, all middle-distance trees, distant horizon "
        "content, AND the player character. Keep only the foreground grass "
        "/ rocks / nearest details — the bottom band of the canvas."
    ),
}


def build_layer_extraction_prompt(layer_id: str) -> str:
    return LAYER_PROMPT_TEMPLATE.format(
        LAYER_NAME=layer_id,
        LAYER_NAME_UPPER=layer_id.upper(),
        LAYER_DEFINITION=LAYER_DEFINITIONS.get(
            layer_id,
            f"Custom layer '{layer_id}'. Use the scene's overall art "
            "style to decide which pixels belong here.",
        ),
        LAYER_EXCLUSIONS=LAYER_EXCLUSIONS.get(
            layer_id,
            "ERASE everything not part of the named layer.",
        ),
    )


# ── Manifest-extraction prompt (text-out, JSON) ────────────────────────────

MANIFEST_PROMPT_TEMPLATE = """\
You are looking at the concept image for a 2D platformer scene called
"{SCENE_NAME}" (biome: {BIOME}). The game uses one canonical unit: 1 TILE
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
  - Declared layers: {DECLARED_LAYERS}
  - Declared tile variants: {DECLARED_TILES}
  - Declared scene_props: {DECLARED_SCENE_PROPS}

Respond with ONLY the JSON code block, no commentary.
"""


def build_manifest_prompt(scene: dict, layer_ids: list[str]) -> str:
    tiles = [v.get("id") for v in scene.get("tilemap", {}).get("tile_variants", []) if v.get("id")]
    props = [p.get("id") for p in scene.get("scene_props", []) if p.get("id")]
    return MANIFEST_PROMPT_TEMPLATE.format(
        SCENE_NAME=scene.get("name", scene.get("id", "")),
        BIOME=scene.get("biome", ""),
        DECLARED_LAYERS=", ".join(layer_ids) if layer_ids else "(none)",
        DECLARED_TILES=", ".join(tiles) if tiles else "(none)",
        DECLARED_SCENE_PROPS=", ".join(props) if props else "(none)",
    )


def parse_json_from_text(text: str) -> dict:
    """Strip ```json fences if present; tolerate stray prose around the
    object. Returns {} on parse failure rather than raising — the caller
    can fall back to defaults."""
    s = text.strip()
    # Strip code fences.
    fence = re.search(r"```(?:json)?\s*\n(.*?)\n```", s, re.S)
    if fence:
        s = fence.group(1).strip()
    # Take first {...} block if model emitted preamble.
    brace = re.search(r"\{.*\}", s, re.S)
    if brace:
        s = brace.group(0)
    try:
        return json.loads(s)
    except Exception:
        return {}


# ── Main ──────────────────────────────────────────────────────────────────

def extract_one_layer(
    project_root: Path,
    scene_id: str,
    layer_id: str,
    concept_path: Path,
    out_dir: Path,
    art_bible_path: Path | None,
    seed: int | None = None,
) -> Path:
    """Make one image-gen call to extract `layer_id` from the concept.
    Returns the path to the alpha-keyed output PNG."""
    prompt = build_layer_extraction_prompt(layer_id)
    extra_refs: list[Path] = []
    if art_bible_path is not None and art_bible_path.exists():
        extra_refs.append(art_bible_path)

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    sys.stderr.write(
        f"[extract:{scene_id}/{layer_id}] vision pass "
        f"backend={backend} cost={cost}¢\n"
    )

    # Match the concept's own resolution as closely as possible.
    concept_img = Image.open(concept_path)
    target_w, target_h = concept_img.size

    with budget.charged(
        project_root, cost, f"image-{backend}",
        note=f"extract-{scene_id}/{layer_id}",
    ):
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            concept_path,
            extra_refs,
            seed=seed,
            aspect_ratio="16:9",
            resolution=(target_w, target_h),
        )

    raw = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    if raw.size != (target_w, target_h):
        raw = raw.resize((target_w, target_h), Image.LANCZOS)

    keyed = stitch.chroma_green_to_alpha(raw)

    out_png = out_dir / f"bg-{layer_id}.png"
    out_prompt = out_dir / f"bg-{layer_id}.prompt.txt"
    out_seed = out_dir / f"bg-{layer_id}.seed.txt"
    out_dir.mkdir(parents=True, exist_ok=True)
    keyed.save(out_png, format="PNG")
    out_prompt.write_text(prompt, encoding="utf-8")
    out_seed.write_text(str(seed_used), encoding="utf-8")
    sys.stderr.write(
        f"  wrote {out_png.relative_to(project_root)} "
        f"({keyed.size[0]}×{keyed.size[1]}, alpha-keyed, seed={seed_used})\n"
    )
    return out_png


def extract_manifest(
    project_root: Path,
    scene: dict,
    concept_path: Path,
    layer_ids: list[str],
    out_dir: Path,
) -> dict:
    """Text-out vision pass: per-asset metadata. Returns the parsed JSON
    or a sensible default on parse failure."""
    prompt = build_manifest_prompt(scene, layer_ids)
    backend = active_backend()
    # Text-out is priced as image equivalent in our budget table.
    cost = budget.cost_for_image(backend)
    sys.stderr.write(
        f"[extract:{scene['id']}/manifest] text-out vision pass "
        f"backend={backend} cost={cost}¢\n"
    )
    with budget.charged(
        project_root, cost, f"text-{backend}",
        note=f"extract-{scene['id']}/manifest",
    ):
        text = generate_text_from_image(prompt, image_paths=[concept_path])

    parsed = parse_json_from_text(text)
    out_path = out_dir / "manifest.json"
    out_prompt = out_dir / "manifest.prompt.txt"
    out_raw = out_dir / "manifest.raw.txt"
    if not parsed:
        sys.stderr.write(
            "  ⚠ manifest JSON parse failed — saving raw text for inspection\n"
        )
        # Sensible fallback so downstream code doesn't crash.
        parsed = {
            "layers": {lid: {"subject_height_tiles": None, "palette": [],
                             "feature_density": "unknown", "notes": ""} for lid in layer_ids},
            "tiles_visible": [],
            "scene_props_visible": [],
            "_parse_failed": True,
        }
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(parsed, indent=2), encoding="utf-8")
    out_prompt.write_text(prompt, encoding="utf-8")
    out_raw.write_text(text, encoding="utf-8")
    sys.stderr.write(f"  wrote {out_path.relative_to(project_root)}\n")
    return parsed


def merge_into_scenes_json(
    project_root: Path,
    scene_id: str,
    layer_results: dict[str, Path],
    manifest: dict,
) -> None:
    """Write extracted_layer_path + (when missing) subject_height_tiles back
    into scenes.json. User-set values are preserved.
    """
    scenes = load_scenes(project_root)
    target = next((s for s in scenes if s.get("id") == scene_id), None)
    if target is None:
        sys.stderr.write(f"  ⚠ scene '{scene_id}' not found in scenes.json — skipping merge\n")
        return

    bg = target.setdefault("background", {})
    raw_layers = bg.get("layers") or []

    new_layers: list[dict] = []
    for entry in raw_layers:
        cfg = normalize_layer_cfg(entry)
        layer_id = cfg["id"]
        if layer_id in layer_results:
            cfg["extracted_layer_path"] = str(
                layer_results[layer_id].relative_to(project_root)
            )
        # Fill subject_height_tiles from manifest only if the user hasn't set it.
        if cfg.get("subject_height_tiles") is None:
            man_layer = (manifest.get("layers") or {}).get(layer_id, {})
            sht = man_layer.get("subject_height_tiles")
            if isinstance(sht, (int, float)):
                cfg["subject_height_tiles"] = float(sht)
        new_layers.append(cfg)

    bg["layers"] = new_layers
    save_scenes(project_root, scenes)
    sys.stderr.write(
        f"  scenes.json updated for scene '{scene_id}' "
        f"({len(layer_results)} layer(s) enriched)\n"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--layers", default=None,
                    help="Comma-separated subset of layers to extract (default: all in scenes.json)")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--force", action="store_true",
                    help="Re-extract even when extracted/bg-<layer>.png already exists")
    ap.add_argument("--no-manifest", action="store_true",
                    help="Skip the text-out manifest pass (saves ~5¢)")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scenes = load_scenes(project_root)
    scene = next((s for s in scenes if s.get("id") == args.scene_id), None)
    if scene is None:
        raise SystemExit(f"scene '{args.scene_id}' not found in scenes.json")

    concept_path = project_root / "assets" / "scenes" / args.scene_id / "concept.png"
    if not concept_path.exists():
        raise SystemExit(
            f"{concept_path} missing. Generate the concept first via "
            f"scripts/generate_scene_concept.py {args.scene_id}"
        )

    art_bible_path = project_root / "assets" / "ART_BIBLE.md"
    if not art_bible_path.exists():
        # Bible isn't strictly required — the concept image carries the
        # style — but it helps; warn and continue.
        sys.stderr.write(
            "  ⚠ assets/ART_BIBLE.md missing; running extraction without it\n"
        )
        art_bible_path_for_ref = None
    else:
        # We don't actually attach the bible to image-gen as an extra ref
        # (it's text); the concept image itself carries the visuals. Keep
        # it in scope for future use.
        art_bible_path_for_ref = None

    out_dir = project_root / "assets" / "scenes" / args.scene_id / "extracted"
    out_dir.mkdir(parents=True, exist_ok=True)

    bg_cfg = scene.get("background", {})
    raw_layers = bg_cfg.get("layers") or []
    all_layer_cfgs = [normalize_layer_cfg(e) for e in raw_layers]
    if args.layers:
        wanted = {x.strip() for x in args.layers.split(",") if x.strip()}
        layer_cfgs = [c for c in all_layer_cfgs if c["id"] in wanted]
        if not layer_cfgs:
            raise SystemExit(f"no matching layers in {wanted} (have: {[c['id'] for c in all_layer_cfgs]})")
    else:
        layer_cfgs = all_layer_cfgs

    if not layer_cfgs:
        raise SystemExit(f"scene '{args.scene_id}' has no background layers declared")

    layer_results: dict[str, Path] = {}
    for cfg in layer_cfgs:
        if not cfg.get("use_extraction", True):
            sys.stderr.write(
                f"  ⏭  skipping {cfg['id']} (use_extraction=false in scenes.json)\n"
            )
            continue
        out_png = out_dir / f"bg-{cfg['id']}.png"
        if out_png.exists() and not args.force:
            sys.stderr.write(
                f"  ⏭  {out_png.relative_to(project_root)} already exists — pass --force to re-extract\n"
            )
            layer_results[cfg["id"]] = out_png
            continue
        try:
            result = extract_one_layer(
                project_root=project_root,
                scene_id=args.scene_id,
                layer_id=cfg["id"],
                concept_path=concept_path,
                out_dir=out_dir,
                art_bible_path=art_bible_path_for_ref,
                seed=args.seed,
            )
            layer_results[cfg["id"]] = result
        except Exception as exc:
            sys.stderr.write(f"  ⚠ extract failed for layer '{cfg['id']}': {exc}\n")
            # Continue with remaining layers; don't fail the whole run.

    if not layer_results:
        sys.stderr.write("  no layers extracted — exiting\n")
        return 1

    manifest: dict = {}
    if not args.no_manifest:
        try:
            manifest = extract_manifest(
                project_root=project_root,
                scene=scene,
                concept_path=concept_path,
                layer_ids=[c["id"] for c in layer_cfgs],
                out_dir=out_dir,
            )
        except Exception as exc:
            sys.stderr.write(f"  ⚠ manifest extraction failed: {exc}\n")

    merge_into_scenes_json(project_root, args.scene_id, layer_results, manifest)

    sys.stderr.write(
        f"\n[extract:{args.scene_id}] done — "
        f"{len(layer_results)}/{len(layer_cfgs)} layer(s) extracted, "
        f"{'manifest written' if manifest else 'manifest skipped'}\n"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
