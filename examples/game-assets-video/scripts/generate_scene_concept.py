#!/usr/bin/env python3
"""generate_scene_concept.py — Render the per-scene concept image + SPEC.md.

For each scene declared in `assets/scenes.json`, produce:
  - assets/scenes/{scene_id}/concept.png      — wide game-screenshot framing
  - assets/scenes/{scene_id}/SPEC.md          — derived asset list with sizes
  - assets/scenes/{scene_id}/concept.prompt.txt + .seed.txt — sidecars

The concept image becomes the **anchor reference** for every other asset
generated for this scene (background segments, tiles, props). It binds
the per-asset look to a single visual contract.

Inputs:
  - assets/visual-target.png (game-wide style anchor)
  - assets/concept/hero-shot.png (art bible's demo composition)
  - assets/ART_BIBLE.md (text rules)
  - assets/scenes.json (scene metadata)

Usage:
  python scripts/generate_scene_concept.py <scene_id> [--seed N]
"""

from __future__ import annotations

import argparse
import json
import sys
import textwrap
from pathlib import Path

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


CONCEPT_ASPECT = "16:9"
CONCEPT_SIZE = 1024


def load_scene(project_root: Path, scene_id: str) -> dict:
    scenes_path = project_root / "assets" / "scenes.json"
    if not scenes_path.exists():
        raise SystemExit(f"{scenes_path} not found")
    scenes = json.loads(scenes_path.read_text(encoding="utf-8"))
    for s in scenes:
        if s.get("id") == scene_id:
            return s
    raise SystemExit(f"scene '{scene_id}' not found in {scenes_path}")


def build_concept_prompt(scene: dict, art_bible: str) -> str:
    biome = scene.get("biome", "")
    chars = scene.get("characters", [])
    bg = scene.get("background", {})
    return textwrap.dedent(f"""\
        Render a wide gameplay-frame concept of the scene below. This image is the **per-scene anchor** that downstream asset generators (background segments, tiles, props) will use as a reference to match palette, lighting, and depth. Output one cohesive image, not a montage.

        SCENE: {scene.get('name', scene.get('id', ''))}
        BIOME: {biome}
        DESCRIPTION: {scene.get('description', '').strip()}

        ART BIBLE (mandatory — every detail must match):

        {art_bible.strip()}

        Composition rules:
        - Wide horizontal framing (16:9). Camera at character height. Mid-gameplay framing — character visible, environment visible, foreground/mid/background depth all readable.
        - Show the parallax depth structure: far layer (cool, hazy), mid layer (mid distance trees / silhouettes), near layer (foreground props that the player would walk past).
        - Include placeholder hints of typical {biome} props at scene-appropriate density. The actual props are generated separately and don't need to match this image pixel-perfect; they need to match the *style*.
        - Lighting matches the bible's stated key-light direction.
        - No text, no UI, no captions, no watermarks.

        Hero character hint: {", ".join(chars) if chars else "(generic player silhouette)"}.

        Style note: this image will be sliced and referenced. Don't include extreme effects (no lens flare, no motion blur, no atmospheric volumetrics). Keep edges crisp and palette tight.
    """).strip()


def build_spec_prompt(scene: dict, art_bible: str) -> str:
    return textwrap.dedent(f"""\
        Derive a SPEC.md for the scene "{scene.get('name')}" listing every asset that needs to be generated, with concrete sizes and notes. The reader will hand this to per-asset generators downstream.

        Output format — exactly this schema, nothing else:

        ```markdown
        # Scene SPEC: {scene.get('id')}

        ## Background
        - Layers: <far / mid / near as listed in scenes.json>
        - Width: <px>, Height: <px>
        - Tile seamlessly: <yes/no>
        - Notes: <2-3 sentences on what each layer should depict>

        ## Tilemap
        - Tile size: <px>
        - Sheet grid: <rows>×<cols>
        - Variants needed: <comma-sep list of variant ids from scenes.json — DO NOT invent new ones>
        - Notes: <1-2 sentences on style, e.g. "rounded grass blades, warm earth, soft shadow under each tile">

        ## Scene props
        - <id>: <description>, <px×px display size>
        - ... (one row per scene_props entry from scenes.json)

        ## Characters in this scene
        - <comma-sep list of character ids from scenes.json>

        ## Shared props referenced
        - <comma-sep list of shared_prop ids from scenes.json>
        ```

        Rules: stay grounded to what scenes.json declared — don't invent new tile variants or props. The "Notes" sections are short style hints downstream prompts can quote.

        Game brief (for tone only):
        SCENE: {scene.get('name', scene.get('id'))}
        BIOME: {scene.get('biome', '')}
        DESCRIPTION: {scene.get('description', '')}

        Scene manifest:
        ```json
        {json.dumps(scene, indent=2)}
        ```

        ART BIBLE excerpt (for style):
        ```
        {art_bible.strip()[:1200]}
        ```

        Output the markdown ONLY — no preamble, no explanation, no code fences around the whole thing.
    """).strip()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("scene_id")
    ap.add_argument("--seed", type=int, default=None)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    scene = load_scene(project_root, args.scene_id)

    visual_target = project_root / "assets" / "visual-target.png"
    bible_path = project_root / "assets" / "ART_BIBLE.md"
    if not bible_path.exists():
        raise SystemExit(f"{bible_path} not found. Run 01-art-bible first.")
    if not visual_target.exists():
        raise SystemExit(f"{visual_target} not found. Run 00-visual-target first.")

    art_bible = bible_path.read_text(encoding="utf-8")

    out_dir = project_root / "assets" / "scenes" / args.scene_id
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / "concept.png"
    prompt_path = out_dir / "concept.prompt.txt"
    seed_path = out_dir / "concept.seed.txt"
    spec_path = out_dir / "SPEC.md"

    backend = active_backend()
    img_cost = budget.cost_for_image(backend)

    # 1. Image
    concept_prompt = build_concept_prompt(scene, art_bible)
    prompt_path.write_text(concept_prompt, encoding="utf-8")
    print(
        f"[scene-concept:{args.scene_id}] image  backend={backend} cost={img_cost}¢",
        file=sys.stderr,
    )
    with budget.charged(project_root, img_cost, f"image-{backend}", note=f"scene-{args.scene_id}/concept"):
        img_bytes, seed_used = generate_image_with_edit(
            concept_prompt,
            visual_target,
            [],  # could include hero-shot too — keep at 1 ref for v1
            seed=args.seed,
            aspect_ratio=CONCEPT_ASPECT,
            resolution=CONCEPT_SIZE,
        )
    png_path.write_bytes(img_bytes)
    seed_path.write_text(str(seed_used), encoding="utf-8")
    print(f"  wrote {png_path.relative_to(project_root)}", file=sys.stderr)

    # 2. SPEC.md (text-out from scene + bible + concept image)
    spec_cost = img_cost  # same pricing proxy
    print(
        f"[scene-concept:{args.scene_id}] spec   backend={backend} cost={spec_cost}¢",
        file=sys.stderr,
    )
    spec_prompt = build_spec_prompt(scene, art_bible)
    with budget.charged(project_root, spec_cost, f"text-{backend}", note=f"scene-{args.scene_id}/SPEC.md"):
        spec_md = generate_text_from_image(spec_prompt, image_paths=[png_path])

    if spec_md.startswith("```"):
        lines = spec_md.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        spec_md = "\n".join(lines)
    spec_path.write_text(spec_md.strip() + "\n", encoding="utf-8")
    print(f"  wrote {spec_path.relative_to(project_root)} ({len(spec_md)} chars)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
