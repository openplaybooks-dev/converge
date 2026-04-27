#!/usr/bin/env python3
"""generate_art_bible.py — Derive ART_BIBLE.md from idea.md + visual-target.png.

The art bible is a structured spec that downstream prompt builders inherit
to keep every asset visually consistent. It captures palette (with hex),
line/shading rules, character proportions, common shapes, and explicit
negatives. Every per-asset prompt later in the pipeline references this
bible (along with the visual-target image and a per-scene concept) so
the generation has multiple anchor points instead of just an art-style
preset string.

Usage:
  python scripts/generate_art_bible.py

Outputs:
  assets/ART_BIBLE.md
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from lib import budget
from lib.image_api import active_backend
from lib.image_api_gemini import generate_text_from_image
from lib.sprite import find_project_root


PROMPT = """\
Read the attached game-screenshot reference and the brief below. Produce
ART_BIBLE.md — a tight, machine-readable style spec that downstream prompts
will inherit to keep every asset visually consistent.

Output format — exactly this schema, nothing else:

```markdown
# Art Bible

## Palette
Dominant colors with hex values:
- <color name>: #RRGGBB — <where it shows up: e.g. character armor, sky, ground>
- ... (5–8 entries)

Accent / highlight colors:
- <color name>: #RRGGBB — <usage>
- ... (2–4 entries)

## Line & shading
- Stroke weight: <description, e.g. "soft 1–2px outline that thickens at silhouette breaks">
- Shading model: <flat | painterly | cel | textured>
- Light direction: <e.g. "above-front-right, single key light">
- Highlights: <e.g. "small specular spots, never broad gradients">

## Character proportions
- Head/body ratio: <e.g. "~1:3 — chibi-leaning, larger heads">
- Hands/feet: <e.g. "simplified, mitten-like, no individual fingers">
- Face: <e.g. "small dot eyes, soft round chin, friendly expressions">
- Outfit detail: <how busy / minimal>

## Environment & forms
- Common shape language: <rounded | angular | organic | geometric>
- Tree / foliage style: <if applicable>
- Stone / structure style: <if applicable>
- Atmospheric depth: <e.g. "haze fade between parallax layers, far reads cooler/lighter">

## Negatives (do NOT)
- <e.g. "no pixel art / 8-bit aesthetic — stay smooth-edged">
- <e.g. "no chromatic aberration / lens flares / filters">
- <e.g. "no text or UI overlays">
- <e.g. "no neon glow or saturated rim lighting">
- ... (4–6 negatives, each specific)
```

Rules (HARD):
- Hex values must be 6-digit `#RRGGBB`. No CSS names.
- Don't invent colors not visible in the reference. Sample from what's there.
- Negatives are concrete things to avoid; don't list "low quality" or generic words.
- Output the markdown ONLY — no preamble, no explanation, no code fences around the whole thing.

Game brief:
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="ART_BIBLE.md")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    idea_path = project_root / "idea.md"
    visual_target = project_root / "assets" / "visual-target.png"

    if not idea_path.exists():
        raise SystemExit(f"idea.md not found at {idea_path}")
    if not visual_target.exists():
        raise SystemExit(
            f"visual-target.png not found at {visual_target}\n"
            f"Run first: python scripts/generate_visual_target.py"
        )

    idea = idea_path.read_text(encoding="utf-8")
    full_prompt = PROMPT + idea.strip()

    backend = active_backend()
    cost = budget.cost_for_image(backend)  # text-out cheaper but charge image-rate as proxy

    print(
        f"[art-bible] deriving from idea.md + visual-target.png  backend={backend} cost={cost}¢",
        file=sys.stderr,
    )

    with budget.charged(project_root, cost, f"text-{backend}", note="ART_BIBLE.md generation"):
        md = generate_text_from_image(full_prompt, image_paths=[visual_target])

    # Strip surrounding code fences if the model wrapped its output.
    if md.startswith("```"):
        md_lines = md.splitlines()
        if md_lines[0].startswith("```"):
            md_lines = md_lines[1:]
        if md_lines and md_lines[-1].startswith("```"):
            md_lines = md_lines[:-1]
        md = "\n".join(md_lines)

    out_path = project_root / "assets" / args.out
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md.strip() + "\n", encoding="utf-8")
    print(f"  wrote {out_path.relative_to(project_root)} ({len(md)} chars)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
