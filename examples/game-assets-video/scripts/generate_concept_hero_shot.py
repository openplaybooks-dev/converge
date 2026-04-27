#!/usr/bin/env python3
"""generate_concept_hero_shot.py — Render the art bible's demo composition.

Produces `assets/concept/hero-shot.png` — a single mid-game-framing image
that shows what a "well made" composition under this bible looks like.
Acts as the secondary anchor reference for every per-scene concept image
(primary anchor = visual-target.png).

Inputs:
  - assets/visual-target.png  — game-wide style anchor
  - assets/ART_BIBLE.md       — explicit style spec to inherit
  - idea.md                   — game brief (optional flavor)

Output:
  assets/concept/hero-shot.png
  assets/concept/hero-shot.prompt.txt
  assets/concept/hero-shot.seed.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from lib import budget
from lib.image_api import generate_image_with_edit, active_backend
from lib.sprite import find_project_root


def build_prompt(idea: str, art_bible: str) -> str:
    return f"""\
Render a hero-shot demonstrating the art bible below. One mid-gameplay
framing — character on a representative environment, central composition,
clean background. Not a logo, not a splash screen, not a portrait — a
single illustrative game frame that future asset generation will reference
to stay visually consistent.

ART BIBLE (mandatory — every detail must match):

{art_bible.strip()}

GAME BRIEF (flavor only):

{idea.strip()}

Composition rules:
- Single character, full body, side-on or 3/4 view, centered horizontally.
- Environment indicates the genre / setting at a glance.
- Lighting matches the bible's described light direction and shading model.
- Palette is restricted to the bible's listed colors (no off-palette).
- No text, no UI, no captions, no watermarks.

Aspect: 16:9. Clean digital rendering, game-engine output (not concept-art frames or border treatments). Every visible detail in this image becomes a reference target for asset generation downstream — so don't include effects we won't replicate per-asset (no lens flare, no atmospheric volumetrics, no motion blur).
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--aspect", default="16:9")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    idea_path = project_root / "idea.md"
    bible_path = project_root / "assets" / "ART_BIBLE.md"
    visual_target = project_root / "assets" / "visual-target.png"
    if not bible_path.exists():
        raise SystemExit(
            f"{bible_path} not found. Run: python scripts/generate_art_bible.py"
        )
    if not visual_target.exists():
        raise SystemExit(
            f"{visual_target} not found. Run: python scripts/generate_visual_target.py"
        )

    idea = idea_path.read_text(encoding="utf-8") if idea_path.exists() else ""
    art_bible = bible_path.read_text(encoding="utf-8")

    out_dir = project_root / "assets" / "concept"
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / "hero-shot.png"
    prompt_path = out_dir / "hero-shot.prompt.txt"
    seed_path = out_dir / "hero-shot.seed.txt"

    prompt = build_prompt(idea, art_bible)
    prompt_path.write_text(prompt, encoding="utf-8")

    backend = active_backend()
    cost = budget.cost_for_image(backend)

    print(
        f"[concept-hero-shot] generating {args.aspect} demo composition backend={backend} cost={cost}¢",
        file=sys.stderr,
    )

    with budget.charged(project_root, cost, f"image-{backend}", note="concept-hero-shot"):
        # Use the visual target as base reference so the model has a visual
        # anchor (the bible alone is text); style still guided by the bible
        # text in the prompt.
        img_bytes, seed_used = generate_image_with_edit(
            prompt,
            visual_target,
            [],
            seed=args.seed,
            aspect_ratio=args.aspect,
            resolution=1024,
        )

    png_path.write_bytes(img_bytes)
    seed_path.write_text(str(seed_used), encoding="utf-8")
    print(f"  wrote {png_path.relative_to(project_root)} (seed={seed_used})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
